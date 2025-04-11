const { generateRandomString } = require('../util');
const { batchApi, coreApi, appsApi, customApi } = require('../util/k8s');

module.exports = {
    /**
     * Install wasm in the provided namespace and return generated API key to connect control panel
     * @param {string} kubeconfig Stringified kubeconfig file
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    installEnvoyWasm: async (kubeconfig, namespace) => {
        try {
            let k8sBatch;
            let k8sCore;
            let k8sCustom;
            try {
                k8sBatch = await batchApi(kubeconfig);
                k8sCore = await coreApi(kubeconfig);
                k8sCustom = await customApi(kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }

            const wasmData = await k8sCore.createNamespacedPersistentVolumeClaim({ namespace, body: { metadata: { name: 'wasm-data', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '100Mi' } } } } })
                .then(wasmData => wasmData)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (wasmData.error && wasmData.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create persistent volume claim' };

            const initJob = await k8sBatch.createNamespacedJob({ namespace, body: { metadata: { name: 'init-job', annotations: { 'sidecar.istio.io/inject': 'false' }, labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { template: { metadata: { name: 'init-job', namespace, annotations: { 'sidecar.istio.io/inject': 'false' } }, spec: { restartPolicy: 'Never', containers: [{ name: 'init-container', image: 'ghcr.io/sap/init:latest', command: ['sh', '-c', 'cp /sundew.wasm /data/'], imagePullPolicy: 'Always', volumeMounts: [{ name: 'wasm', mountPath: '/data' }], }], volumes: [{ name: 'wasm', persistentVolumeClaim: { claimName: 'wasm-data' } }] } } } } })
                .then(initJob => initJob)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (initJob.error && initJob.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create init job' };

            let apiKey;
            const envoyFilterExists = await k8sCustom.getNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', name: 'cloudactivedefense-filter' })
                .then(envoyFilter => envoyFilter)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (envoyFilterExists.error && envoyFilterExists.reason == 'NotFound') {
                apiKey = generateRandomString(65);
                const envoyFilter = await k8sCustom.createNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', body: { apiVersion: 'networking.istio.io/v1alpha3', kind: 'EnvoyFilter', metadata: { name: 'cloudactivedefense-filter', namespace, labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { workloadSelector: { labels: { protects: 'protectedApp' } }, configPatches: [{ applyTo: 'HTTP_FILTER', match: { context: 'SIDECAR_INBOUND', listener: { filterChain: { filter: { name: 'envoy.filters.network.http_connection_manager', subFilter: { name: 'envoy.filters.http.router', } } } } }, patch: { operation: 'INSERT_BEFORE', value: { name: 'envoy.filters.http.wasm', typedConfig: { '@type': 'type.googleapis.com/udpa.type.v1.TypedStruct', type_url: 'type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm', value: { config: { rootId: 'my_root_id', vmConfig: { code: { local: { filename: 'var/local/lib/wasm/sundew.wasm' } }, runtime: 'envoy.wasm.runtime.v8', vmId: 'cad-filter' }, configuration: { '@type': 'type.googleapis.com/google.protobuf.StringValue', value: `{"ENVOY_API_KEY": "${apiKey}"}` } } } } } } }, { applyTo: 'CLUSTER', match: { context: 'SIDECAR_OUTBOUND', }, patch: { operation: 'ADD', value: { name: 'controlpanel-api', type: 'STRICT_DNS', lb_policy: 'ROUND_ROBIN', load_assignment: { cluster_name: 'controlpanel-api', endpoints: [{ lb_endpoints: [{ endpoint: { address: { socket_address: { address: 'controlpanel-api-service', port_value: 80 } } } }] }] } } } }] } } })
                    .then(envoyFilter => envoyFilter)
                    .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
                if (envoyFilter.error && envoyFilter.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create envoy filter' };
            }
            const controlpanelService = await k8sCore.createNamespacedService({ namespace, body: { metadata: { name: 'controlpanel-api-service', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { type: 'ExternalName', externalName: 'controlpanel-api-service.controlpanel.svc.cluster.local', ports: [{ port: 80 }] } } })
                .then(controlpanelService => controlpanelService)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (controlpanelService.error && controlpanelService.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create controlpanel service' };

            return { code: 200, type: 'success', message: 'Envoy wasm installed successfully', ...(apiKey && { data: apiKey }) };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Reconfigure (and enable) envoy to use wasm in the provided deployment. 
     * It can automatically install wasm if it's missing
     * @param {string} kubeconfig Stringified kubeconfig file
     * @param {string} deploymentName Name of application deployment
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    reconfigEnvoy: async (kubeconfig, deploymentName, namespace) => {
        try {
            let k8sApp;
            let k8sCore;
            try {
                k8sApp = await appsApi(kubeconfig);
                k8sCore = await coreApi(kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            let envoyInstallResult;

            const existingNamespace = await k8sCore.readNamespace({ name: namespace })
                .then(namespace => namespace)
                .catch(() => null);
            if (!existingNamespace) return { code: 404, type: 'error', message: 'Namespace not found' };

            const existingDeployment = await k8sApp.readNamespacedDeployment({ namespace, name: deploymentName })
                .then(existingDeployment => existingDeployment)
                .catch(() => null);
            if (!existingDeployment) return { code: 404, type: 'error', message: 'Deployment not found' };

            const wasmVolume = await k8sCore.readNamespacedPersistentVolumeClaim({ namespace, name: 'wasm-data' })
                .then(wasmVolume => wasmVolume)
                .catch(() => null);
            if (!wasmVolume) {
                envoyInstallResult = await module.exports.installEnvoyWasm(kubeconfig, namespace);
                if (envoyInstallResult.code !== 200) return { code: 500, type: 'error', message: `Wasm volume is missing, tried to install it but got error: ${envoyInstallResult.message}` };
            }
            const istioLabel = existingDeployment.spec.template.metadata.labels['sidecar.istio.io/inject'];
            if ((!istioLabel || istioLabel !== 'true') && existingNamespace.metadata.labels['istio-injection'] !== 'enabled') {
                const patchedDeployment = await k8sApp.patchNamespacedDeployment(
                    {
                        namespace, name: deploymentName, body: [
                            { op: 'add', path: '/spec/template/metadata/labels/sidecar.istio.io~1inject', value: 'true' }]
                    })
                    .then(patchedDeployment => patchedDeployment)
                    .catch(() => null);
                if (!patchedDeployment) return { code: 500, type: 'error', message: `Failed to install envoy: Could not patch deployment ${deploymentName}` };
            }
            k8sApp.patchNamespacedDeployment({
                namespace, name: deploymentName, body: [
                    { op: 'add', path: '/spec/template/metadata/labels/protects', value: 'protectedApp' },
                    { op: 'add', path: '/spec/template/metadata/annotations', value: {} },
                    { op: 'add', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolume', value: '{"sundew":{"persistentVolumeClaim":{"claimName":"wasm-data"}}}' },
                    { op: 'add', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolumeMount', value: '{"sundew":{"mountPath":"var/local/lib/wasm","readOnly":true}}' }
                ]
            }).then(() => null).catch(() => null);
            return { code: 200, type: 'success', message: 'Envoy reconfigured successfully', ...(envoyInstallResult ? { data: envoyInstallResult.data } : {}) };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Renew API key for envoy filter
     * @param {string} kubeconfig Stringified kubeconfig file
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    renewApiKey: async (kubeconfig, namespace) => {
        try {
            let k8sCustom;
            try {
                k8sCustom = await customApi(kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            const apiKey = generateRandomString(65);
            const patchError = await k8sCustom.patchNamespacedCustomObject({ name: 'cloudactivedefense-filter', group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', body: [{ op: 'replace', path: '/spec/configPatches/0/patch/value/typedConfig/value/config/configuration/value', value: `{"ENVOY_API_KEY": "${apiKey}"}`}]})
            .catch(()=>({ code: 500, type: 'error', message: 'Failed to renew API key for envoy: Could not patch envoy config'}));
            if (patchError.type == 'error') return patchError;
            return { code: 200, type: 'success', message: 'Envoy API key renewed successfully', data: apiKey };
        } catch (e) {
            throw e;
        }
    }
}
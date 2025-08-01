const { generateRandomString, isUuid, isValidNamespaceName, isValidDeploymentName } = require('../util');
const { batchApi, coreApi, appsApi, customApi, getKubeconfig, isKymaCluster } = require('../util/k8s');

module.exports = {
    /**
     * Install wasm in the provided namespace
     * @param {UUID} cu_id Customer ID
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    installEnvoyWasm: async (cu_id, namespace) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!namespace) return { code: 400, type: 'error', message: 'Namespace is required' };
            if (!isUuid(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            if (isValidNamespaceName(namespace)) return { code: 400, type: 'error', message: 'Invalid namespace, must be in kubernetes valid name format' };

            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sBatch;
            let k8sCore;
            try {
                k8sBatch = await batchApi(kubeconfigResponse.kubeconfig);
                k8sCore = await coreApi(kubeconfigResponse.kubeconfig);
                
                const kyma = await isKymaCluster(kubeconfigResponse.kubeconfig);
                if (!kyma) return { code: 500, type: 'error', message: 'Cluster must be a Kyma cluster, cannot continue' };
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }

            const existingNamespace = await k8sCore.readNamespace({ name: namespace })
                .then(namespace => namespace)
                .catch(() => null);
            if (!existingNamespace) return { code: 404, type: 'error', message: 'Namespace not found' };

            const wasmData = await k8sCore.createNamespacedPersistentVolumeClaim({ namespace, body: { metadata: { name: 'wasm-data', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '100Mi' } } } } })
                .then(wasmData => wasmData)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (wasmData.error && wasmData.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create persistent volume claim' };

            const initJob = await k8sBatch.createNamespacedJob({ namespace, body: { metadata: { name: 'init-job', annotations: { 'sidecar.istio.io/inject': 'false' }, labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { template: { metadata: { name: 'init-job', namespace, annotations: { 'sidecar.istio.io/inject': 'false' }, labels: { 'protected-by': 'cloudactivedefense' } }, spec: { restartPolicy: 'Never', containers: [{ name: 'init-container', image: 'ghcr.io/sap/init:latest', command: ['sh', '-c', 'cp /sundew.wasm /data/'], imagePullPolicy: 'Always', volumeMounts: [{ name: 'wasm', mountPath: '/data' }], }], volumes: [{ name: 'wasm', persistentVolumeClaim: { claimName: 'wasm-data' } }] } } } } })
                .then(initJob => initJob)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (initJob.error && initJob.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create init job' };

            const controlpanelService = await k8sCore.createNamespacedService({ namespace, body: { metadata: { name: 'controlpanel-api-service', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { type: 'ExternalName', externalName: 'controlpanel-api-service.controlpanel.svc.cluster.local', ports: [{ port: 80 }] } } })
                .then(controlpanelService => controlpanelService)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (controlpanelService.error && controlpanelService.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create controlpanel service' };

            return { code: 200, type: 'success', message: 'Envoy wasm installed successfully' };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Reconfigure (and enable) envoy to use wasm in the provided deployment. 
     * It can automatically install wasm if it's missing
     * @param {UUID} cu_id Customer ID
     * @param {string} deploymentName Name of application deployment
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    reconfigEnvoy: async (cu_id, deploymentName, namespace) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!namespace) return { code: 400, type: 'error', message: 'Namespace is required' };
            if (!deploymentName) return { code: 400, type: 'error', message: 'Deployment name is required' };
            if (!isUuid(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            if (isValidNamespaceName(namespace)) return { code: 400, type: 'error', message: 'Invalid namespace, must be in kubernetes valid name format' };
            if (isValidDeploymentName(deploymentName)) return { code: 400, type: 'error', message: 'Invalid deployment name, must be in kubernetes valid name format' };

            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sApp;
            let k8sCore;
            let k8sCustom;
            try {
                k8sApp = await appsApi(kubeconfigResponse.kubeconfig);
                k8sCore = await coreApi(kubeconfigResponse.kubeconfig);
                k8sCustom = await customApi(kubeconfigResponse.kubeconfig);
                
                const kyma = await isKymaCluster(kubeconfigResponse.kubeconfig);
                if (!kyma) return { code: 500, type: 'error', message: 'Cluster must be a Kyma cluster, cannot continue' };
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
                envoyInstallResult = await module.exports.installEnvoyWasm(cu_id, namespace);
                if (envoyInstallResult.code !== 200) return { code: 500, type: 'error', message: `Wasm volume is missing, tried to install it but got error: ${envoyInstallResult.message}` };
            }

            const envoyfilterName = `cloudactivedefense-${deploymentName.substring(0, Math.max(0, 63 - "cloudactivedefense-filter-".length))}-filter`;
            let apiKey;
            const envoyFilterExists = await k8sCustom.getNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', name: envoyfilterName })
                .then(envoyFilter => envoyFilter)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (envoyFilterExists.error && envoyFilterExists.reason == 'NotFound') {
                apiKey = generateRandomString(65);
                const envoyFilter = await k8sCustom.createNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', body: { apiVersion: 'networking.istio.io/v1alpha3', kind: 'EnvoyFilter', metadata: { name: envoyfilterName, namespace, labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' } }, spec: { workloadSelector: { labels: { protects: deploymentName } }, configPatches: [{ applyTo: 'HTTP_FILTER', match: { context: 'SIDECAR_INBOUND', listener: { filterChain: { filter: { name: 'envoy.filters.network.http_connection_manager', subFilter: { name: 'envoy.filters.http.router', } } } } }, patch: { operation: 'INSERT_BEFORE', value: { name: 'envoy.filters.http.wasm', typedConfig: { '@type': 'type.googleapis.com/udpa.type.v1.TypedStruct', type_url: 'type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm', value: { config: { rootId: 'my_root_id', vmConfig: { code: { local: { filename: 'var/local/lib/wasm/sundew.wasm' } }, runtime: 'envoy.wasm.runtime.v8', vmId: 'cad-filter' }, configuration: { '@type': 'type.googleapis.com/google.protobuf.StringValue', value: `{"ENVOY_API_KEY": "${apiKey}", "DEPLOYMENT": "${deploymentName}", "NAMESPACE": "${namespace}"}` } } } } } } }, { applyTo: 'CLUSTER', match: { context: 'SIDECAR_OUTBOUND', }, patch: { operation: 'ADD', value: { name: 'controlpanel-api', type: 'STRICT_DNS', lb_policy: 'ROUND_ROBIN', load_assignment: { cluster_name: 'controlpanel-api', endpoints: [{ lb_endpoints: [{ endpoint: { address: { socket_address: { address: 'controlpanel-api-service', port_value: 80 } } } }] }] } } } }] } } })
                    .then(envoyFilter => envoyFilter)
                    .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
                if (envoyFilter.error && envoyFilter.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install wasm: Could not create envoy filter' };
            }

            const istioLabel = existingDeployment.spec.template.metadata.labels['sidecar.istio.io/inject'];
            if (existingNamespace.metadata.labels['istio-injection'] !== 'enabled') {
                if (!istioLabel || istioLabel !== 'true') { 
                    const patchedDeployment = await k8sApp.patchNamespacedDeployment(
                        {
                            namespace, name: deploymentName, body: [
                                { op: 'add', path: '/spec/template/metadata/labels/sidecar.istio.io~1inject', value: 'true' },
                                { op: 'add', path: '/metadata/annotations/envoy-usedBefore', value: 'false' }
                            ]
                        })
                        .then(patchedDeployment => patchedDeployment)
                        .catch(() => null);
                    if (!patchedDeployment) return { code: 500, type: 'error', message: `Failed to install envoy: Could not patch deployment ${deploymentName}` };
                } else {
                    const patchedDeployment = await k8sApp.patchNamespacedDeployment({
                        namespace, name: deploymentName, body: [{ op: 'add', path: '/metadata/annotations/envoy-usedBefore', value: 'true' }]
                    })
                    .then(patchedDeployment => patchedDeployment)
                    .catch(() => null);
                    if (!patchedDeployment) return { code: 500, type: 'error', message: `Failed to install envoy: Could not patch deployment ${deploymentName}` };
                }
            }
            k8sApp.patchNamespacedDeployment({
                namespace, name: deploymentName, body: [
                    { op: 'add', path: '/metadata/labels/protected-by', value: 'cloudactivedefense' },
                    { op: 'add', path: '/spec/template/metadata/labels/protected-by', value: 'cloudactivedefense' },
                    { op: 'add', path: '/spec/template/metadata/labels/protects', value: deploymentName },
                    { op: 'add', path: '/spec/template/metadata/annotations', value: {} },
                    { op: 'add', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolume', value: '{"sundew":{"persistentVolumeClaim":{"claimName":"wasm-data"}}}' },
                    { op: 'add', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolumeMount', value: '{"sundew":{"mountPath":"var/local/lib/wasm","readOnly":true}}' }
                ]
            }).then(() => null).catch(() => null);
            return { code: 200, type: 'success', message: 'Envoy reconfigured successfully', ...(apiKey ? { data: apiKey } : {}) };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Renew API key for envoy filter
     * @param {UUID} cu_id Customer ID
     * @param {string} namespace Namespace of application
     * @param {string} deploymentName Name of application deployment
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    renewApiKey: async (cu_id, namespace, deploymentName) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!namespace) return { code: 400, type: 'error', message: 'Namespace is required' };
            if (!deploymentName) return { code: 400, type: 'error', message: 'Deployment name is required' };
            if (!isUuid(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            if (isValidNamespaceName(namespace)) return { code: 400, type: 'error', message: 'Invalid namespace, must be in kubernetes valid name format' };
            if (isValidDeploymentName(deploymentName)) return { code: 400, type: 'error', message: 'Invalid deployment name, must be in kubernetes valid name format' };

            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sCustom;
            try {
                k8sCustom = await customApi(kubeconfigResponse.kubeconfig);
                
                const kyma = await isKymaCluster(kubeconfigResponse.kubeconfig);
                if (!kyma) return { code: 500, type: 'error', message: 'Cluster must be a Kyma cluster, cannot continue' };
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            
            const existingNamespace = await k8sCore.readNamespace({ name: namespace })
                .then(namespace => namespace)
                .catch(() => null);
            if (!existingNamespace) return { code: 404, type: 'error', message: 'Namespace not found' };

            const existingDeployment = await k8sApp.readNamespacedDeployment({ namespace, name: deploymentName })
                .then(existingDeployment => existingDeployment)
                .catch(() => null);
            if (!existingDeployment) return { code: 404, type: 'error', message: 'Deployment not found' };
            
            const envoyfilterName = `cloudactivedefense-${deploymentName.substring(0, Math.max(0, 63 - "cloudactivedefense-filter-".length))}-filter`;
            const apiKey = generateRandomString(65);
            const patchError = await k8sCustom.patchNamespacedCustomObject({ name: envoyfilterName, group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', body: [{ op: 'replace', path: '/spec/configPatches/0/patch/value/typedConfig/value/config/configuration/value', value: `{"ENVOY_API_KEY": "${apiKey}"}`}]})
            .catch(()=>({ code: 500, type: 'error', message: 'Failed to renew API key for envoy: Could not patch envoy config'}));
            if (patchError.type == 'error') return patchError;
            return { code: 200, type: 'success', message: 'Envoy API key renewed successfully', data: apiKey };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Uninstall Envoy for a specific deployment
     * @param {UUID} cu_id Customer ID
     * @param {string} namespace Namespace of the application
     * @param {string} deploymentName Name of application deployment
     * @returns {{code: number, type: string, message: string}}
     */
    uninstallEnvoy: async (cu_id, namespace, deploymentName) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!namespace) return { code: 400, type: 'error', message: 'Namespace is required' };
            if (!deploymentName) return { code: 400, type: 'error', message: 'Deployment name is required' };
            if (!isUuid(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            if (isValidNamespaceName(namespace)) return { code: 400, type: 'error', message: 'Invalid namespace, must be in kubernetes valid name format' };
            if (isValidDeploymentName(deploymentName)) return { code: 400, type: 'error', message: 'Invalid deployment name, must be in kubernetes valid name format' };

            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sBatch;
            let k8sCore;
            let k8sApp;
            let k8sCustom;
            try {
                k8sBatch = await batchApi(kubeconfigResponse.kubeconfig);
                k8sCore = await coreApi(kubeconfigResponse.kubeconfig);
                k8sApp = await appsApi(kubeconfigResponse.kubeconfig);
                k8sCustom = await customApi(kubeconfigResponse.kubeconfig);

                const kyma = await isKymaCluster(kubeconfigResponse.kubeconfig);
                if (!kyma) return { code: 500, type: 'error', message: 'Cluster must be a Kyma cluster, cannot continue' };
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }

            const existingNamespace = await k8sCore.readNamespace({ name: namespace })
                .then(namespace => namespace)
                .catch(() => null);
            if (!existingNamespace) return { code: 404, type: 'error', message: 'Namespace not found' };
            const existingDeployment = await k8sApp.readNamespacedDeployment({ namespace, name: deploymentName })
                .then(existingDeployment => existingDeployment)
                .catch(() => null);
            if (!existingDeployment) return { code: 404, type: 'error', message: 'Deployment not found' };

            const otherDeploymentsUsingWasm = await k8sApp.listNamespacedDeployment({ namespace, labelSelector: 'protected-by=cloudactivedefense' })
            .then(dep => dep)
            .catch(() => null);

            if (otherDeploymentsUsingWasm.items.length <= 1) {
                const pvc = await k8sCore.deleteNamespacedPersistentVolumeClaim({ namespace, name: 'wasm-data' })
                    .then(pvc => pvc)
                    .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
                if (pvc.error && pvc.reason != 'NotFound') return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not delete persistent volume claim' };
                const initJob = await k8sBatch.deleteNamespacedJob({ namespace, name: 'init-job' })
                    .then(job => job)
                    .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
                if (initJob.error && initJob.reason != 'NotFound') return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not delete init job' };

                const controlpanelService = await k8sCore.deleteNamespacedService({ namespace, name: 'controlpanel-api-service' })
                    .then(svc => svc)
                    .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
                if (controlpanelService.error && controlpanelService.reason != 'NotFound') return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not delete controlpanel service' };

            }
            const envoyFilter = await k8sCustom.deleteNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', name: `cloudactivedefense-${deploymentName.substring(0, Math.max(0, 63 - "cloudactivedefense-filter-".length))}-filter` })
                .then(envoyFilter => envoyFilter)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (envoyFilter.error && envoyFilter.reason != 'NotFound') return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not delete envoy filter' };


            if (existingDeployment.metadata.annotations['envoy-usedBefore'] == 'false'){
                const istioPatchedDeployment = await k8sApp.patchNamespacedDeployment({
                    name: existingDeployment.metadata.name, namespace, body: [
                        { op: 'replace', path: '/spec/template/metadata/labels/sidecar.istio.io~1inject', value: 'false' },
                    ]
                })
                    .then(dep => dep)
                    .catch(() => null);
                if (!istioPatchedDeployment) return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not patch deployment' };

            }

            const patchedDeployment = await k8sApp.patchNamespacedDeployment({
                name: existingDeployment.metadata.name, namespace, body: [
                    { op: 'remove', path: '/metadata/annotations/envoy-usedBefore' },
                    { op: 'remove', path: '/metadata/labels/protected-by' },
                    { op: 'remove', path: '/spec/template/metadata/labels/protected-by' },
                    { op: 'remove', path: '/spec/template/metadata/labels/protects' },
                    { op: 'remove', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolume' },
                    { op: 'remove', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolumeMount' },
                ]
            })
                .then(dep => dep)
                .catch(() => null);
            if (!patchedDeployment) return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not patch deployment' };


            const pods = await k8sCore.deleteCollectionNamespacedPod({ namespace, labelSelector: 'protected-by=cloudactivedefense' })
                .then(pods => pods)
                .catch(e => ({ error: true, reason: JSON.parse(e.body).reason }));
            if (pods.error && pods.reason != 'NotFound') return { code: 500, type: 'error', message: 'Failed to uninstall envoy: Could not delete pod' };

            return { code: 200, type: 'success', message: 'Envoy successfully uninstalled' };
        } catch (e) {
            throw e ;
        }
    }
}
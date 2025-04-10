const { coreApi, customApi, clientApi } = require("../util/k8s");
const { generateRandomString, encodeBase64, decodeBase64, sleep } = require("../util");

module.exports = {
    /**
     * Install telemetry to ship proxy logs to controlpanel
     * @param {string} kubeconfig Stringified kubeconfig file
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    installTelemetry: async (kubeconfig, namespace) => {
        try {
            let k8sCore;
            let k8sCustom;
            try {
                k8sCore = await coreApi(kubeconfig);
                k8sCustom = await customApi(kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            
            const existingNamespace = await k8sCore.readNamespace({ name: namespace })
            .then(namespace=>namespace)
            .catch(()=>null);
            if (!existingNamespace) return { code: 404, type: 'error', message: 'Namespace not found' };
            
            const modulesPatch = await k8sCustom.patchNamespacedCustomObject({ version: 'v1beta2', plural: 'kymas', namespace: 'kyma-system', name: 'default', group: 'operator.kyma-project.io', body: [{ op: 'add', path: '/spec/modules/-', value: { name: 'telemetry' }}]})
            .then(module=>module)
            .catch(e=> ({ error: true, body: JSON.parse(e.body) }));
            if (modulesPatch.error && !modulesPatch.body.details.causes.find(cause => cause.reason == "FieldValueDuplicate") ) return { code: 500, type: 'error', message: 'Failed to install telemetry: Could not patch modules' };

            const existingFluentbitSecret = await k8sCore.readNamespacedSecret({ namespace, name: 'fluentbit-api-key-secret'}).then(fluentbitSecret=>fluentbitSecret).catch(()=>null);
            let randomKey;
            if (!existingFluentbitSecret) {
                randomKey = generateRandomString(65);
                const fluentbitSecret = await k8sCore.createNamespacedSecret({ namespace, body: { metadata: { name: 'fluentbit-api-key-secret', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' }}, data: { FLUENTBIT_API_KEY: encodeBase64(randomKey) }}})
                .then(fluentbitSecret=>fluentbitSecret)
                .catch(e=>({ error: true, reason: JSON.parse(e.body).reason }));
                if (fluentbitSecret.error && fluentbitSecret.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install telemetry: Could not create fluentbit secret' };
            }
            else randomKey = decodeBase64(existingFluentbitSecret.data.FLUENTBIT_API_KEY);
            
            var telemetry_up = true;
            while (telemetry_up) {
                const telemetryManager = await k8sCustom.getNamespacedCustomObject({ group: 'operator.kyma-project.io', plural: 'telemetries', version: 'v1alpha1', name: 'default', namespace: 'kyma-system' }).then(telemetryManager=>telemetryManager).catch(()=>null);
                if (telemetryManager && telemetryManager.status && telemetryManager.status.state == 'Ready') telemetry_up = false;
                await sleep(6000);
            }

            const controlpanelLogPipeline = await k8sCustom.createClusterCustomObject({ group: 'telemetry.kyma-project.io', plural: 'logpipelines', version: 'v1alpha1', body: { apiVersion: 'telemetry.kyma-project.io/v1alpha1', kind: 'LogPipeline', metadata: { name: 'custom-controlpanel', labels: { 'app.kubernetes.io/managed-by': 'cloudactivedefense' }}, spec: { 
                input: { application: { containers: { include: ['istio-proxy'] } } },
                output: { custom: `name http\nhost controlpanel-api-service.${namespace}.svc.cluster.local\nuri /logs\nformat json\nheader Authorization \${API_KEY}` }, 
                variables: [{ name: 'API_KEY', valueFrom: { secretKeyRef: { name: 'fluentbit-api-key-secret', namespace, key: 'FLUENTBIT_API_KEY' } } }], 
                filters: [{ custom: `Name grep\nRegex log \\b(type\\"\\s*:\\s*\\"(alert|event|system|debug))\\b` }, { custom: "Name nest\nOperation lift\nNested_under kubernetes\nAdd_prefix kubernetes." }, { custom: "Name nest\nOperation lift\nNested_under kubernetes.labels\nAdd_prefix kubernetes.labels." }, { custom: "Name modify\nHard_copy kubernetes.namespace_name namespace\nHard_copy kubernetes.labels.app application" }, { custom: "Name nest\nOperation nest\nWildcard kubernetes.*\nNest_under kubernetes.labels\nRemove_prefix kubernetes.labels." }, { custom: "Name nest\nOperation nest\nWildcard kubernetes.*\nNest_under kubernetes\nRemove_prefix kubernetes." }, { custom: "Name modify\nRemove kubernetes" }]
            }}}).then(logPipeline=>logPipeline).catch(e=> ({ error: true, reason: JSON.parse(e.body).reason }));
            if (controlpanelLogPipeline.error && controlpanelLogPipeline.reason != 'AlreadyExists') return { code: 500, type: 'error', message: 'Failed to install telemetry: Could not create controlpanel log pipeline' };

            return { code: 200, type: 'success', data: randomKey, message: 'Successfully created and deployed secret' };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Renew the API key for fluentbit
     * @param {string} kubeconfig Stringified kubeconfig file
     * @param {string} namespace Namespace of application
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    renewApiKey: async (kubeconfig, namespace) => {
        try {
            let k8sCore;
            try {
                k8sCore = await coreApi(kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            const apiKey = generateRandomString(65);
            const patchError = await k8sCore.patchNamespacedSecret({name: 'fluentbit-api-key-secret', namespace, body: [{ op: 'add', path: '/data/FLUENTBIT_API_KEY', value: encodeBase64(apiKey)}]})
            .catch(()=>({ code: 500, type: 'error', message: 'Failed to renew API key for fluentbit: Could not patch fluentbit secret'}));
            if (patchError.type == 'error') return patchError;
            return { code: 200, type: 'success', message: 'Fluentbit API key renewed successfully', data: apiKey };
        } catch(e) {
            throw e;
        }
    },
}
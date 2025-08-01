const { getKubeconfig, isKymaCluster, coreApi, batchApi, customApi, appsApi } = require('../util/k8s');
const { isUuid } = require('../util');

module.exports = {
    /**
     * Clean the cluster for a specific customer
     * @param {UUID} cu_id customer id
     * @returns {{ code: number, type: success | error , message: string }}
     */
    cleanCluster: async (cu_id) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!isUuid(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            
            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;

            let k8sBatch;
            let k8sCore;
            let k8sCustom;
            let k8sApp;
            try {
                k8sBatch = await batchApi(kubeconfigResponse.kubeconfig);
                k8sCore = await coreApi(kubeconfigResponse.kubeconfig);
                k8sCustom = await customApi(kubeconfigResponse.kubeconfig);
                k8sApp = await appsApi(kubeconfigResponse.kubeconfig);
                
                const kyma = await isKymaCluster(kubeconfigResponse.kubeconfig);
                if (!kyma) return { code: 500, type: 'error', message: 'Cluster must be a Kyma cluster, cannot continue' };
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            const namespacesInError = [];
            const namespaceToClean = (await k8sBatch.listJobForAllNamespaces({ labelSelector: 'app.kubernetes.io/managed-by=cloudactivedefense' })).items.map(job => job.metadata.namespace);
            for (namespace of namespaceToClean) {
                try {
                    await k8sBatch.deleteCollectionNamespacedJob({ namespace, labelSelector: 'app.kubernetes.io/managed-by=cloudactivedefense'});
                    await k8sCore.deleteCollectionNamespacedPod({ namespace, labelSelector: 'protected-by=cloudactivedefense'});
                    await k8sCustom.deleteCollectionNamespacedCustomObject({ group: 'networking.istio.io', version: 'v1alpha3', namespace, plural: 'envoyfilters', labelSelector: 'app.kubernetes.io/managed-by=cloudactivedefense' });
                    const deployments = await k8sApp.listNamespacedDeployment({ namespace, labelSelector: 'protected-by=cloudactivedefense' })
                    for (const deployment of deployments.items) {
                        if (deployment.metadata.annotations['envoy-usedBefore'] == 'false'){
                            await k8sApp.patchNamespacedDeployment({
                                name: deployment.metadata.name, namespace, body: [
                                    { op: 'replace', path: '/spec/template/metadata/labels/sidecar.istio.io~1inject', value: 'false' },
                                ]
                            });
                        }

                        await k8sApp.patchNamespacedDeployment({
                            name: deployment.metadata.name, namespace, body: [
                                { op: 'remove', path: '/metadata/annotations/envoy-usedBefore' },
                                { op: 'remove', path: '/metadata/labels/protected-by' },
                                { op: 'remove', path: '/spec/template/metadata/labels/protected-by' },
                                { op: 'remove', path: '/spec/template/metadata/labels/protects' },
                                { op: 'remove', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolume' },
                                { op: 'remove', path: '/spec/template/metadata/annotations/sidecar.istio.io~1userVolumeMount' },
                            ]
                        });
                    }
                    await k8sCore.deleteNamespacedPersistentVolumeClaim({ namespace, name: 'wasm-data' });
                    await k8sCore.deleteNamespacedService({ namespace, name: 'controlpanel-api-service' });
                    await k8sCore.deleteCollectionNamespacedSecret({ namespace, labelSelector: 'app.kubernetes.io/managed-by=cloudactivedefense' });
                } catch (e) {
                    namespacesInError.push(namespace);
                }
            }
            await k8sCustom.deleteCollectionClusterCustomObject({ group: 'telemetry.kyma-project.io', plural: 'logpipelines', version: 'v1alpha1', labelSelector: 'app.kubernetes.io/managed-by=cloudactivedefense' });
            if (namespacesInError.length > 0) {
                return { code: 500, type: 'error', message: `Not all the namespaces could be cleaned: Could not clean the following namespaces: ${namespacesInError.join(', ')}` };
            }
            return { code: 200, type: 'success', message: 'Cluster cleaned successfully' };
        } catch (e) {
            throw e
        }
    }
}
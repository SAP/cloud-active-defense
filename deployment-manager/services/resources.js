const { coreApi, appsApi, getKubeconfig } = require("../util/k8s");
const Customer = require('../model/Customer');

module.exports = {
    /**
     * Return list of namespaces in the cluster
     * @param {UUID} cu_id Customer ID
     * @returns {{code: number, type: 'success' | 'error', message: string, data?: string}}
     */
    getNamespaces: async (cu_id) => {
        try {
            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sCore;
            try {
                k8sCore = await coreApi(kubeconfigResponse.kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            const namespaces = await k8sCore.listNamespace()
            .then(namespaces=>namespaces)
            .catch(()=>null);
            if (!namespaces) return { code: 404, type: 'error', message: 'No namespace found' };
            return { code: 200, type: 'success', data: namespaces.items.map(ns=>ns.metadata.name), message: 'Successfully retrieved namespaces' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * Return list of deployment and status for a given namespace
     * @param {UUID} cu_id Customer ID
     * @param {string} namespace Namespace to get deployment from
     * @returns {{code: number, type: 'success' | 'error', message: string, data?: string}}
     */
    getDeployments: async (cu_id, namespace) => {
        try {
            const kubeconfigResponse = await getKubeconfig(cu_id);
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sApp;
            try {
                k8sApp = await appsApi(kubeconfigResponse.kubeconfig);
            } catch (e) {
                return { code: 500, type: 'error', message: 'Could not connect to cluster with provided kubeconfig' };
            }
            const deployments = await k8sApp.listNamespacedDeployment({ namespace })
            .then(deployments=>deployments)
            .catch(()=>null);
            if (!deployments) return { code: 404, type: 'error', message: 'No deployment found' };
            return { code: 200, type: 'success', data: deployments.items.map(deployment=>({ name: deployment.metadata.name, maxReplicas: deployment.status.replicas, currentReplicas: deployment.status.availableReplicas })), message: 'Successfully retrieved deployments' };
        } catch(e) {
            throw e;
        }
    }
}
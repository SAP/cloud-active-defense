/**
 * 
 * @param {String} kubeconfig Stringified kubeconfig file
 */
async function connectToK8s(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = new k8s.KubeConfig();
        kc.loadFromString(kubeconfig);
        return kc;
    } catch(e) {
        throw e;
    }
}
async function coreApi(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        return kc.makeApiClient(k8s.CoreV1Api);
    } catch(e) {
        throw e;
    }
}
async function appsApi(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        return kc.makeApiClient(k8s.AppsV1Api);
    } catch(e) {
        throw e;
    }
}
async function batchApi(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        return kc.makeApiClient(k8s.BatchV1Api);
    } catch(e) {
        console.error(e)
        throw e;
    }
}
async function customApi(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        return kc.makeApiClient(k8s.CustomObjectsApi);
    } catch(e) {
        throw e;
    }
}
async function clientApi(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        return k8s.KubernetesObjectApi.makeApiClient(kc);
    } catch(e) {
        throw e;
    }
}
async function canConnectToCluster(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        const coreApi = kc.makeApiClient(k8s.CoreV1Api);
        await coreApi.readNamespace({name: 'default'});
    } catch (error) {
        throw error
    }
}
/**
 * 
 * @param {UUID} cu_id 
 * @returns {{ code?: number, type: 'success' | 'error', message: string, kubeconfig?: string}}
 */
async function getKubeconfig(cu_id) {
    try {
        const Customer = require('../model/Customer');
        const customer = await Customer.findOne({ where: { id: cu_id } });
        if (!customer) return { code: 404, type: 'error', message: 'Customer does not exist' };
        if (!customer.kubeconfig) return { code: 404, type: 'error', message: 'No kubeconfig provided for customer' };
        return { type: 'success', kubeconfig: customer.kubeconfig.replace(/\\n/g, '\n') };
    }
    catch (e) {
        throw e;
    }
}
module.exports = {
    connectToK8s,
    coreApi,
    appsApi,
    batchApi,
    customApi,
    clientApi,
    canConnectToCluster,
    getKubeconfig
}
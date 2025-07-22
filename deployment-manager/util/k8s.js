/**
 * 
 * @param {String} kubeconfig Stringified kubeconfig file
 */
async function connectToK8s(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = new k8s.KubeConfig();
        kc.loadFromString(kubeconfig);
        await canConnectToCluster(kc);
        return kc;
    } catch(e) {
        throw e;
    }
}
async function connectTocurrentK8s() {
    try {
        const k8s = await import('@kubernetes/client-node');       
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        await canConnectToCluster(kc);
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
async function currentCoreApi() {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectTocurrentK8s();
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
async function canConnectToCluster(kc) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const coreApi = kc.makeApiClient(k8s.CoreV1Api);
        await coreApi.readNamespace({name: 'default'});
    } catch (error) {
        throw error
    }
}
async function isKymaCluster(kubeconfig) {
    try {
        const k8s = await import('@kubernetes/client-node');
        const kc = await connectToK8s(kubeconfig);
        const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
        const kymaCluster = await customApi.listNamespacedCustomObject({ group:'operator.kyma-project.io', version: 'v1beta2', plural: 'kymas', namespace: 'kyma-system' })
        return kymaCluster.items.length > 0;
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
    connectTocurrentK8s,
    coreApi,
    currentCoreApi,
    appsApi,
    batchApi,
    customApi,
    clientApi,
    canConnectToCluster,
    isKymaCluster,
    getKubeconfig
}
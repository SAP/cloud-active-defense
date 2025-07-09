const { connectTocurrentK8s, currentCoreApi } = require("../util/k8s");
const { generateRandomString, encodeBase64 } = require("../util");

module.exports = {
    /**
     * Renew API key for keycloak
     * @returns {{code: number, type: string, message: string, data?: string}}
     */
    createApiKey: async () => {
        try {
            const kubeconfigResponse = await connectTocurrentK8s();
            if (kubeconfigResponse.type == 'error') return kubeconfigResponse;
            let k8sCore;
            try {
                k8sCore = await currentCoreApi();
            } catch (e) {
                console.error("Error connecting to current cluster:", e);
                return { code: 500, type: 'error', message: 'Could not connect to current cluster' };
            }
            
            const apiKey = generateRandomString(65);
            const patchError = await k8sCore.patchNamespacedSecret({name: "keycloak-secrets", namespace: 'controlpanel', body: [{ op: 'add', path: '/data/KEYCLOAK_API_KEY', value: encodeBase64(apiKey)}]})
            .catch(()=>({ code: 500, type: 'error', message: 'Failed to create API key for keycloak: Could not patch keycloak secrets'}));
            if (patchError.type == 'error') return patchError;
            return { code: 200, type: 'success', message: 'Keylcoak API key created successfully', data: apiKey };
        } catch (e) {
            throw e;
        }
    }
}
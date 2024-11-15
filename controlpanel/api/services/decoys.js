const { application } = require('express');
const { isJSON } = require('../util');

const axios = require('axios').default;

const CONFIGMANAGER_URL = "http://localhost:3000";

module.exports = {
    /**
    *   Return list of decoys from configmanager
    */
    getDecoysList: async (namespace, application) => {
        try {
            if (!namespace || !application) {
                namespace = 'unknown';
                application = 'unknown';
            }
            const response = await axios.get(`${CONFIGMANAGER_URL}/${namespace}/${application}`);
            if (response.status != 200) {
                if (response.data && response.data.decoy) {
                    return { type: 'error', code: 404, message: 'No file found' }
                }
                return { type: 'error', code: 500, message: 'Could not retrieve decoys list' };
            }
            return { type: 'success', code: 200, data: response.data.decoy, message: 'Successful operation' }
        } catch(e) {
            throw e;
        }
    },
    /**
     * Update decoys list in configmanager
     * @param {Object} decoys New list of decoys
     */
    updateDecoysList: async (namespace, application, decoys) => {
        try {
            if (!namespace || !application) {
                namespace = 'unknown';
                application = 'unknown';
            }
            if (isJSON(decoys)){
                return { type: 'error', code: 422, message: "Validation exception" };
            }
            const response = await axios.post(`${CONFIGMANAGER_URL}/${namespace}/${application}`, { decoys });
            if (response.status != 200) {
                if (response.data && response.data.decoy) {
                    return { type: 'error', code: 404, message: 'No file found' }
                }
                return { type: 'error', code: 500, message: "Could not update decoys list" };
            }
            return { type: 'success', code: 201, data: "Decoys list updated" };
        } catch(e) {
            throw e;
        }
    },
}
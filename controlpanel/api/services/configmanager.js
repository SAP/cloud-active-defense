const { validateDecoyFilter } = require('../util/validator');
const { CONFIGMANAGER_URL } = require('../util/variables');

const axios = require('axios');


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
            for (const decoy of decoys) {
                if (validateDecoyFilter(decoy).length) return { type: 'error', code: 422, message: "There are errors in one of the decoys, cannot send to configmanager" }
            }
            const response = await axios.post(`${CONFIGMANAGER_URL}/${namespace}/${application}`,{ decoys: { filters: decoys }});
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
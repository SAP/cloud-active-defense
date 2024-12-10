const axios = require('axios').default;
const { CONFIGMANAGER_URL } = require('../util/variables');

module.exports = {

    /**
     * Return global config from configmanager
     */
    getConfig: async () => {
        try {
            const response = await axios.get(`${CONFIGMANAGER_URL}/CHANGE/ME`);
            if (response.status != 200) { 
                return { type: 'error', data: "Could not retrieve global config" };
            }
            return { type: 'success', data: response.data.config };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Update global config in configmanager
     * @param {Object} config 
     */
    updateConfig: async (config) => {
        try {
            if (typeof config != 'object') {
                return { type: 'error', data: "Payload is not JSON object" };
            }
            const response = await axios.put(`${CONFIGMANAGER_URL}/CHANGE/ME`, { config });
            if (response.status != 200) {
                return { type: 'error', data: "Could not update global config" };
            }
            return { type: 'success', data: "Global config updated" };
        } catch(e) {
            throw e;
        }
    },
}
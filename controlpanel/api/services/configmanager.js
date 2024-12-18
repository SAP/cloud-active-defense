const { validateDecoyFilter } = require('../util/decoy-validator');
const { validateConfig } = require('../util/config-validator');
const { CONFIGMANAGER_URL } = require('../util/variables');
const ProtectedApp = require('../models/ProtectedApp')
const Config = require('../models/Config-data')
const Decoy = require('../models/Decoy-data')

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
            if (!decoys.length) return { type: 'warning', code: 200, message: "Decoys list is empty or full of inactive decoy, cannot sync" };
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
            return { type: 'success', code: 201, message: "Decoys list updated" };
        } catch(e) {
            throw e;
        }
    },

    /**
     * Return global config from configmanager
     * @param {string} namespace namespace of app
     * @param {string} application name of app
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: JSON, message: string}}
     */
    getConfig: async (namespace, application) => {
        try {
            if (!namespace || !application) {
                namespace = 'unknown';
                application = 'unknown';
            }
            const response = await axios.get(`${CONFIGMANAGER_URL}/${namespace}/${application}`);
            if (response.status != 200) {
                if (response.data && response.data.config) {
                    return { type: 'error', code: 404, message: 'No file found' }
                }
                return { type: 'error', code: 500, message: 'Could not retrieve global config' };
            }
            return { type: 'success', code: 200, data: response.data.config, message: 'Successful operation' }
        } catch(e) {
            throw e;
        }
    },
    /**
     * Update global config in configmanager
     * @param {string} namespace namespace of app
     * @param {string} application name of app
     * @param {Object} config
     * @return {{type: 'success' | 'error' | 'warning', code: number, data: JSON, message: string}}
     */
    updateConfig: async (namespace, application, config) => {
        try {
            if (!namespace || !application) {
                namespace = 'unknown';
                application = 'unknown';
            }
            if (validateConfig(config).length) return { type: 'error', code: 422, message: "There are errors in the global config, cannot send to configmanager" };
            const response = await axios.post(`${CONFIGMANAGER_URL}/${namespace}/${application}`,{ config });
            if (response.status != 200) {
                if (response.data && response.data.config) {
                    return { type: 'error', code: 404, message: 'No file found' };
                }
                return { type: 'error', code: 500, message: "Could not update global config" };
            }
            return { type: 'success', code: 201, message: "Global config updated" };
        } catch(e) {
            throw e;
        }
    },

    sendDataToConfigmanager: async () => {
        try {
            const protectedApps = await ProtectedApp.findAll({ include: [{ model: Decoy, as: 'decoys', attributes: ['decoy', 'state'] }, { model: Config, as: 'configs', attributes: ['config'] }] })
            for (const pa of protectedApps) {
                module.exports.updateDecoysList(pa.namespace, pa.application, pa.decoys.map(decoyData => decoyData.state == 'active' && decoyData.decoy))
                module.exports.updateConfig(pa.namespace, pa.application, pa.configs);
            }
            return { type: 'success', message: "Successful operation", code: 200 };
        } catch(e) {
            return { type: 'error', message: "Server error", data: e, code: 500 };
        }
    }
}
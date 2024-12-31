const { validateDecoyFilter } = require('../util/decoy-validator');
const { validateConfig } = require('../util/config-validator');
const { CONFIGMANAGER_URL } = require('../util/variables');
const ProtectedApp = require('../models/ProtectedApp')
const Config = require('../models/Config-data')
const Decoy = require('../models/Decoy-data')
const { isUUID } = require('../util/index')

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
    updateDecoysList: async (pa_id) => { 
        try {
            const protectedApp = await ProtectedApp.findByPk(pa_id);
            if (!protectedApp || !isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            const decoys = await Decoy.update({ deployed: true }, { where: { pa_id }, returning: true});
            const activeDecoys = decoys[1].filter(decoyData => decoyData.state == 'active').map(decoyData => decoyData.decoy);
            if (!activeDecoys.length) return { type: 'warning', code: 200, message: "Decoys list is empty or full of inactive decoy, cannot sync" };
            for (const decoy of activeDecoys) {
                if (validateDecoyFilter(decoy).length) return { type: 'error', code: 422, message: "There are errors in one of the decoys, cannot send to configmanager" }
            }
            const response = await axios.post(`${CONFIGMANAGER_URL}/${protectedApp.namespace}/${protectedApp.application}`,{ decoys: { filters: activeDecoys }});
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
            return { type: 'success', code: 200, data: response.data.config.config, message: 'Successful operation' }
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
    updateConfig: async (pa_id) => {
        try {
            const protectedApp = await ProtectedApp.findByPk(pa_id);
            if (!protectedApp || !isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            const config = await Config.update({ deployed: true }, { where: { pa_id }, returning: true });
            if (!config[1].length) return { type: 'warning', code: 200, message: "Global config is empty or not saved, cannot sync" };
            if (validateConfig(config[1][0].config).length) return { type: 'error', code: 422, message: "There are errors in the global config, cannot send to configmanager" };
            const response = await axios.post(`${CONFIGMANAGER_URL}/${protectedApp.namespace}/${protectedApp.application}`,{ config: config[1][0].config });
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
                module.exports.updateDecoysList(pa.id)
                module.exports.updateConfig(pa.id);
            }
            return { type: 'success', message: "Successful operation", code: 200 };
        } catch(e) {
            return { type: 'error', message: "Server error", data: e, code: 500 };
        }
    },
    /**
     * 
     * @param {DataType.UUID} pa_id UUID of the protected app
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data?: Error, message: string}}
     */
    createFile: async (pa_id) => {
        try {
            if (!isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid protected app id supplied' };
            const protectedApp = await ProtectedApp.findOne({ where: { id: pa_id } });
            if (!protectedApp) return { type: 'error', code: 404, message: 'Protected app not found' };
            const response = await axios.post(`${CONFIGMANAGER_URL}/file`, { namespace: protectedApp.namespace, application: protectedApp.application });
            if (response.data.status == 'error') return { type: 'error', code: 500, message: response.data.message };
            return { type: 'success', code: 200 , message: response.data.message };
        } catch(e) {
            return { type: 'error', message: "Server error", data: e, code: 500 };
        }
    }
}
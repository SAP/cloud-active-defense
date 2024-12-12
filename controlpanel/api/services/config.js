const Config = require('../models/Config-data');
const ProtectedApp = require('../models/ProtectedApp');
const { DataTypes } = require('sequelize')
const { isUUID, isJSON } = require('../util/index')
const { validateConfig } = require('../util/config-validator');

module.exports = {
    /**
     * Return global config from database
     * @param {DataTypes.UUID} pa_id UUID of the protected app
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    getConfig: async (pa_id)  => {
        try {
            if (!isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid pa_id supplied' };
            const config = await Config.findOne({ where: { pa_id } });
            if (!config) return { type: 'success', code: 404, message: 'No config found for this app' };
            return { type: 'success', code: 200, data: config, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * Update global config in database
     * @param {JSON} configData config to update or create
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string, data: Model | null}}
     */
    updateConfig: async (configData) => {
        try {
            let config;
            if (typeof configData != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!configData.pa_id) return { type: 'error', code: 400, message:'No protectedApp id provided' };
            if (!isUUID(configData.pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            if (!await ProtectedApp.findByPk(configData.pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            if (typeof configData.config == 'object') config = configData.config;
            else if (!isJSON(configData.config)) return { type: 'error', code: 422, message: 'Config is not an object' };
            else config = JSON.parse(configData.config);
            const validationErrors = validateConfig(config);
            if (validationErrors.length) return { type: 'error', code: 422, message: 'Bad json provided, there are errors in the config object', data: validationErrors };
            
            const existingConfig = await Config.findOne({ where: { pa_id: configData.pa_id }});
            if (configData.id) delete configData.id
            if (existingConfig) {
                await Config.update(configData, { where: { id: existingConfig.id }})
                return { type: 'success', code: 200, message: 'Successful operation' };
            } else {
                const savedDecoy = await Config.create(configData);
                return { type: 'success', code: 201, message: 'Successful operation', data: savedDecoy };
            }
        } catch(e) {
            throw e;
        }
    }
    
}
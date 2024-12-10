const { DataTypes } = require('sequelize');
const { isUUID, isJSON } = require('../util');
const Decoy = require('../models/Decoy-data');
const { validateDecoyFilter } = require('../util/validator');
const ProtectedApp = require('../models/ProtectedApp');

module.exports = {
    /**
     * 
     * @param {DataTypes.UUID} id UUID of the decoy
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    findDecoyById: async (id) => {
        try {
            if (!isUUID(id)) return { type: 'error', code: 400, message: 'Invalid decoy id supplied' };
            const decoy = await Decoy.findByPk(id);
            if (!decoy) return { type: 'success', code: 404, message: 'Decoy not found', data: {} };
            return { type: 'success', code: 200, message: 'Successful operation', data: decoy };
        } catch(e) {
            throw e;
        }
    },
    /**
     * 
     * @param {JSON} decoyData new decoy to create
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    createDecoy: async (decoyData) => {
        try {
            let decoy;
            if (typeof decoyData != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!decoyData.pa_id) return { type: 'error', code: 400, message:'No protectedApp id provided' };
            if (!isUUID(decoyData.pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            if (!await ProtectedApp.findByPk(decoyData.pa_id)) return { type: 'error', code: 400, message: 'Invalid protectedApp id provided' };
            if (typeof decoyData.decoy == 'object') decoy = decoyData.decoy;
            else if (!isJSON(decoyData.decoy)) return { type: 'error', code: 422, message: 'Decoy is not an object' };
            else decoy = JSON.parse(decoyData.decoy);
            const validationErrors = validateDecoyFilter(decoy);
            if (validationErrors.length) return { type: 'error', code: 422, message: 'Bad json provided, there are errors in the decoy object', data: validationErrors };
            
            const savedDecoy = await Decoy.create(decoyData);
            return { type: 'success', code: 201, message: 'Successful operation', data: savedDecoy };
        } catch(e) {
            throw e;
        }
    },
    /**
     * @param {DataTypes.UUID} id decoy id to delete
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string}}
     */
    deleteDecoy: async (id) => {
        try {
            if (!isUUID(id)) return { type: 'error', code: 400, message: 'Invalid decoy id supplied' };
            const decoy = await Decoy.destroy({ where: { id } });
            if (!decoy) return { type: 'error', code: 404, message: 'Decoy not found' };
            return { type: 'success', code: 200, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * 
     * @param {DataTypes.UUID} id decoy id to update 
     * @param {JSON} decoy new decoy object
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    updateDecoy: async (id, decoy) => {
        try {
            if (typeof decoy != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!isUUID(id)) return { type: 'error', code: 400, message: 'Invalid decoy id supplied' };
            const validationErrors = validateDecoyFilter(decoy);
            if (validationErrors.length) return { type: 'error', code: 422, message: 'Bad json provided, there are errors in the decoy object', data: validationErrors };
            
            const updatedDecoy = await Decoy.update({ decoy }, { where: { id }});
            if (!updatedDecoy['0']) return { type: 'success', code: 404, message: 'Decoy not found' };
            return { type: 'success', code: 200, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    }
}
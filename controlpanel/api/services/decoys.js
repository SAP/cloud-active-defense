const Decoy = require('../models/Decoy-data');
const { isUUID } = require('../util/index');
const { DataTypes } = require('sequelize')

module.exports = {
    /**
    *   Return list of decoys from Database
    * @param {DataTypes.UUID} pa_id protected app id
    * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
    */
    getDecoysList: async (pa_id) => {
        try {
            if (!isUUID(pa_id)) return { type: 'error', code: 400, message: 'Invalid pa_id supplied' };
            const decoys = await Decoy.findAll({ where: { pa_id } });
            if (!decoys.length) return { type: 'success', code: 404, message: 'No decoys found for this app' };
            return { type: 'success', code: 200, data: decoys, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
}
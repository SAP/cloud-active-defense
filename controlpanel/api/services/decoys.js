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
    /**
     * Update decoys state
     * @param {Array.<{id: UUID, state: 'active' | 'inactive' | 'error'}>} decoysData list of decoys to change state
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    updateDecoysStates: async (decoysData) => {
        try {
            let errorInUpdate = false;
            const decoyToUpdatePromises = [];

            if (!Array.isArray(decoysData)) return { type: 'error', code: 400, message: 'Payload should be an array' };

            const actualDecoy = await Decoy.findAll({ where: { id: decoysData.map(decoyData => decoyData.id) }, attributes: ['id', 'state']});
            for (const decoyData of decoysData) {
                if (!decoyData.state || !decoyData.id) continue;
                if (decoyData.state === 'error') {
                    errorInUpdate = true;
                    continue;
                }
                if (decoyData.state !== 'active' && decoyData.state !== 'inactive') {
                    errorInUpdate = true;
                    continue;
                }
                if (actualDecoy.find(decoy => decoy.id == decoyData.id).state == 'error' && decoyData.state == 'active') {
                    errorInUpdate = true;
                    continue;
                }
                decoyToUpdatePromises.push(Decoy.update({ state: decoyData.state }, { where: { id: decoyData.id }}));
            }
            const results = await Promise.allSettled(decoyToUpdatePromises);
            errorInUpdate = results.find(result => result.status == 'rejected');

            if (!results.find(result => result.status == 'fulfilled')) return { type: 'error', code: 200, message: "No decoys have been updated" };
            if (errorInUpdate) return { type: 'error', code: 207, message: 'Some decoys could not be updated' };
            return { type: 'success', code: 201, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
}
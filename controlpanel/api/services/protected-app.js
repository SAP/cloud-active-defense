const Decoy = require("../models/Decoy-data");
const ProtectedApp = require("../models/ProtectedApp");
const configmanager = require("./configmanager");

module.exports = {
    /**
     * Returns a list of protected apps
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    getProtectedApps: async () => {
        try {
            const protectedApps = await ProtectedApp.findAll();
            return { type: 'success', code: 200, message: 'successful operation', data: protectedApps }
        } catch (e) {
            throw e;
        }
    },
    /**
     * Create protected app and calls createFile() from configmanager service
     * @param {JSON} protectedApp protectedApp object
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string, data?: Model}}
     */
    createProtectedApp: async (protectedApp) => {
        try {
            if (typeof protectedApp != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!protectedApp.namespace || !protectedApp.application) return { type: 'error', code: 400, message: 'namespace and/or application are missing' };
            const existingProtectedApp = await ProtectedApp.findOne({ where: { namespace: protectedApp.namespace, application: protectedApp.application }})
            if(existingProtectedApp) {
                if(existingProtectedApp.namespace != 'default' && existingProtectedApp.application != 'default') configmanager.createFile(existingProtectedApp.id);
                return { type: 'error', message: 'Protected app alredy exists, cannot create protected app duplicates', code: 409, data: existingProtectedApp };
            }
            const newProtectedApp = await ProtectedApp.create({ namespace: protectedApp.namespace, application: protectedApp.application }, { returning: true });
            if(newProtectedApp.namespace != 'default' && newProtectedApp.application != 'default') {
                configmanager.createFile(newProtectedApp.id);
                const defaultApp = await ProtectedApp.findOne({ where: { namespace: 'default', application: 'default' }});
                const defaultDecoy = await Decoy.findAll({ where: { pa_id: defaultApp.id }, attributes: ['decoy'] });
                Decoy.bulkCreate(defaultDecoy.map(decoy => {
                    return { deployed: false, decoy: decoy.decoy, pa_id: newProtectedApp.id };
                }));
            }
            return { type: 'success', code: 201, message: 'successful operation', data: newProtectedApp };
        } catch (e) {
            throw e;
        }
    },
}
const ProtectedApp = require("../models/ProtectedApp");
const configmanager = require("./configmanager");

module.exports = {
    /**
     * Returns a list of protected apps
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
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string}}
     */
    createProtectedApp: async (protectedApp) => {
        try {
            if (typeof protectedApp != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!protectedApp.namespace || !protectedApp.application) return { type: 'error', code: 400, message: 'namespace and/or application are missing' };
            const existingProtectedApp = await ProtectedApp.findOne({ where: { namespace: protectedApp.namespace, application: protectedApp.application }})
            if(existingProtectedApp) {
                configmanager.createFile(existingProtectedApp.id);
                return { type: 'error', message: 'Protected app alredy exists, cannot create protected app duplicates', code: 409 };
            }
            const newProtectedApp = await ProtectedApp.create({ namespace: protectedApp.namespace, application: protectedApp.application }, { returning: true });
            configmanager.createFile(newProtectedApp.id);
            return { type: 'success', code: 201, message: 'successful operation' }
        } catch (e) {
            throw e;
        }
    },
}
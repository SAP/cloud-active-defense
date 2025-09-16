const Decoy = require("../models/Decoy-data");
const ProtectedApp = require("../models/ProtectedApp");
const Config = require("../models/Config-data");
const Customer = require("../models/Customer");

module.exports = {
    /**
     * Returns a list of protected apps
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    getProtectedApps: async (cu_id) => {
        try {
            const protectedApps = await ProtectedApp.findAll({ where: { cu_id }});
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000; // 15 minutes ago as timestamp
            const sixtyMinutesAgo = Date.now() - 60 * 60 * 1000; // 60 minutes ago as timestamp
            
            return { type: 'success', code: 200, message: 'successful operation', data: protectedApps.map(pa => {
                return { ...pa.dataValues, lightColor: pa.dataValues.lastConfigTime < sixtyMinutesAgo ? 'red-light' : pa.dataValues.lastConfigTime < fifteenMinutesAgo ? 'yellow-light' : 'green-light' };
            })};
        } catch (e) {
            throw e;
        }
    },
    /**
     * Create protected app
     * @param {JSON} protectedApp protectedApp object
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string, data?: Model}}
     */
    createProtectedApp: async (protectedApp) => {
        try {
            if (typeof protectedApp != 'object') return { type: 'error', code: 422, message: 'Payload should be a json' };
            if (!protectedApp.namespace || !protectedApp.application) return { type: 'error', code: 400, message: 'namespace and/or application are missing' };
            const existingCustomer = await Customer.findOne({ where: { id: protectedApp.cu_id }});
            if (!existingCustomer) return { type: 'error', code: 404, message: 'Customer not found' };
            const existingProtectedApp = await ProtectedApp.findOne({ where: { namespace: protectedApp.namespace, application: protectedApp.application, cu_id: protectedApp.cu_id }});
            if(existingProtectedApp) {
                return { type: 'error', message: 'Protected app alredy exists, cannot create protected app duplicates', code: 409, data: existingProtectedApp };
            }
            const newProtectedApp = await ProtectedApp.create({ namespace: protectedApp.namespace, application: protectedApp.application, cu_id: existingCustomer.id }, { returning: true });
            if(newProtectedApp.namespace != 'default' && newProtectedApp.application != 'default') {
                const defaultApp = await ProtectedApp.findOne({ where: { namespace: 'default', application: 'default' }});
                const defaultDecoy = await Decoy.findAll({ where: { pa_id: defaultApp.id }, attributes: ['decoy'] });
                Decoy.bulkCreate(defaultDecoy.map(decoy => {
                    return { deployed: false, decoy: decoy.decoy, pa_id: newProtectedApp.id };
                }));
                const defaultConfig = await Config.findOne({ where: { pa_id: defaultApp.id }, attributes: ['config'] });
                Config.create({ config: defaultConfig.config, deployed: false, pa_id: newProtectedApp.id });
            }
            return { type: 'success', code: 201, message: 'successful operation', data: newProtectedApp };
        } catch (e) {
            throw e;
        }
    },
}
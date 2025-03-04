const ProtectedApp = require('../models/ProtectedApp')
const Config = require('../models/Config-data')
const Decoy = require('../models/Decoy-data')
const Blocklist = require('../models/Blocklist')
const protectedAppService = require('./protected-app')

module.exports = {
    /**
     * Return list of active decoys & config from Database
     * @param {string} namespace
     * @param {string} application
     * 
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data?: Model, message: string}}
     */
    getActiveDecoysConfig: async (namespace, application) => {
        try {
            if (!namespace || !application) return { type: 'error', code: 400, message: 'Invalid namespace or application supplied' };
            const protectedApp = await ProtectedApp.findOne({ where: { namespace, application } });
            if (!protectedApp) {
                const newProtectedApp = await protectedAppService.createProtectedApp({ namespace, application });
                if (newProtectedApp.type === 'error') console.error(`Could not create protected app for namespace: ${namespace} and application: ${application}. Error: ${newProtectedApp.message}`);
                else return { type: 'error', code: 404, message: 'Invalid namespace or application supplied' };
            }
            const decoys = await Decoy.findAll({ where: { pa_id: protectedApp.id, deployed: true } });
            const config = await Config.findOne({ where: { pa_id: protectedApp.id, deployed: true } });
            return { type: 'success', code: 200, data: { decoys: decoys.map(decoy => decoy.decoy), config: config ? config.config : {} }, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * Set blocklisted users from envoy proxy
     * @param {string} namespace
     * @param {string} application
     * @param {{blocklist: Object, throttle: Object}} blocklist
     * 
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string}}
     */
    setBlocklist: async (namespace, application, blocklist) => {
        try {
            if (!namespace || !application) return { type: 'error', code: 400, message: 'Invalid namespace or application supplied' };
            const protectedApp = await ProtectedApp.findOne({ where: { namespace, application } });
            if (!protectedApp) return { type: 'error', code: 404, message: 'Invalid namespace or application supplied' };
            if (!blocklist) return { type: 'error', code: 400, message: 'Invalid blocklist supplied' };
            if (blocklist.blocklist && blocklist.blocklist.length)
                Blocklist.bulkCreate(blocklist.blocklist.map(item => ({ pa_id: protectedApp.id, content: item, type: 'blocklist' })));
            if (blocklist.throttle && blocklist.throttle.length)
                Blocklist.bulkCreate(blocklist.throttle.map(item => ({ pa_id: protectedApp.id, content: item, type: 'throttle' })));
            return { type: 'success', code: 200, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
    /**
     * Return blocklist and throttle list from Database
     * @param {string} namespace 
     * @param {string} application 
     * 
     * @returns {{type: 'success' | 'error' | 'warning', code: number, data: Model, message: string}}
     */
    getBlocklist: async (namespace, application) => {
        try {
            if (!namespace || !application) return { type: 'error', code: 400, message: 'Invalid namespace or application supplied' };
            const protectedApp = await ProtectedApp.findOne({ where: { namespace, application } });
            if (!protectedApp) return { type: 'error', code: 404, message: 'Invalid namespace or application supplied' };
            const blocklist = await Blocklist.findAll({ where: { pa_id: protectedApp.id } });
            for (const blockElement of blocklist) {
                if (blockElement.content.Duration == 'forever') continue;
                const duration = parseInt(blockElement.content.Duration.substring(0, blockElement.content.Duration.length - 1));
                const ext = blockElement.content.Duration.slice(-1);
                const unbanDate = new Date(blockElement.content.Time * 1000);

                if (ext == 's') unbanDate.setSeconds(unbanDate.getSeconds() + duration);
                if (ext == 'm') unbanDate.setMinutes(unbanDate.getMinutes() + duration);
                if (ext == 'h') unbanDate.setHours(unbanDate.getHours() + duration);
                
                if (new Date() > unbanDate) {
                    Blocklist.destroy({ where: { id: blockElement.id } });
                    blocklist.splice(blocklist.indexOf(blockElement), 1);
                }
            }
            return { type: 'success', code: 200, data: blocklist, message: 'Successful operation' };
        } catch(e) {
            throw e;
        }
    },
}
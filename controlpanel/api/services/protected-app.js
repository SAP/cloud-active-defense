const ProtectedApp = require("../models/ProtectedApp");

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
    }
}
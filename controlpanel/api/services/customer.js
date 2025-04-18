const fs = require('fs');
const Customer = require('../models/Customer');

module.exports = {
    /**
     * Add kubeconfig to customer to be used for deployment manager
     * @param {DataTypes.UUID} cu_id customer id to upload kubeconfig for
     * @param {string} kubeconfigPath kubeconfig file path to upload
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string}}
     */
    uploadKubeconfig: async (cu_id, kubeconfigPath) => {
        try {
            const kubeconfig = fs.readFileSync(kubeconfigPath, 'utf8').replace(/\n/g, '\\n');
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            if (!kubeconfig) return { type: 'error', code: 400, message: 'No kubeconfig provided' };
            else Customer.update({ kubeconfig }, { where: { id: cu_id } });
            fs.unlinkSync(kubeconfigPath);
            return { type: 'success', code: 200, message: 'Kubeconfig uploaded successfully' };
        } catch (e) {
            fs.unlinkSync(kubeconfigPath);
            throw e;
        }
    }
}
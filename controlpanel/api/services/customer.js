const fs = require('fs');
const Customer = require('../models/Customer');
const path = require('path');

const UPLOADS_DIR = path.resolve('uploads/kubeconfig/');

module.exports = {
    /**
     * Add kubeconfig to customer to be used for deployment manager
     * @param {DataTypes.UUID} cu_id customer id to upload kubeconfig for
     * @param {string} kubeconfigPath kubeconfig file path to upload
     * @returns {{type: 'success' | 'error' | 'warning', code: number, message: string}}
     */
    uploadKubeconfig: async (cu_id, kubeconfigPath) => {
        try {
            const resolvedPath = path.resolve(kubeconfigPath);
            if (!resolvedPath.startsWith(UPLOADS_DIR)) {
                return { type: 'error', code: 400, message: 'Invalid file path' };
            }

            const kubeconfig = fs.readFileSync(resolvedPath, 'utf8').replace(/\n/g, '\\n');
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            if (!kubeconfig) return { type: 'error', code: 400, message: 'No kubeconfig provided' };
            else Customer.update({ kubeconfig }, { where: { id: cu_id } });
            fs.unlinkSync(resolvedPath);
            return { type: 'success', code: 200, message: 'Kubeconfig uploaded successfully' };
        } catch (e) {
            const resolvedPath = path.resolve(kubeconfigPath);
            if (resolvedPath.startsWith(UPLOADS_DIR)) {
                fs.unlinkSync(resolvedPath);
            }
            throw e;
        }
    }
}
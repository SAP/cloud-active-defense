const fs = require('fs');
const Customer = require('../models/Customer');
const ApiKey = require('../models/Api-key');
const { createProtectedApp } = require('./protected-app');
const { createDecoy } = require('./decoy');
const { updateConfig } = require('./config');
const path = require('path');
const { cleanCluster } = require('./deployment-manager');
const ProtectedApp = require('../models/ProtectedApp');
const sequelize = require('sequelize');

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
    },
    /**
     * Create a new customer
     * @param {string} name Name of the customer to create
     * @returns {{type: 'success' | 'error', code: number, message: string, data?: object}}
     */
    createCustomer: async (name) => {
        try {
            const customer = await Customer.create({ name });
            const defaultApp = await createProtectedApp({ namespace: 'default', application: 'default', cu_id: customer.id }); 
            if (defaultApp.type == 'success') {
                createDecoy({ pa_id: defaultApp.data.id, decoy:{decoy:{key:"x-cloud-active-defense",separator:"=",value:"ACTIVE"},inject:{store:{inResponse:".*",as:"header"}}}});
                updateConfig({ pa_id:defaultApp.data.id, deployed: true, config:{alert:{session:{in:"cookie",key:"SESSION"}}}});
            }
            
            if (process.env.ENVOY_API_KEY && !process.env.DEPLOYMENT_MANAGER_URL) {
                ApiKey.findOrCreate({ where: { key: process.env.ENVOY_API_KEY, permissions: ["configmanager"], pa_id: defaultApp.data.id }});
            }
            if (process.env.FLUENTBIT_API_KEY && !process.env.DEPLOYMENT_MANAGER_URL) {
                ApiKey.findOrCreate({ where: { key: process.env.FLUENTBIT_API_KEY, permissions: ["fluentbit"], pa_id: defaultApp.data.id }});
            }
            return { type: 'success', code: 201, message: 'Customer created successfully', data: customer };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Clean everything related to a customer, including cluster, protected apps, decoys, configs, logs, and apiKeys
     * @param {DataTypes.UUID} cu_id 
     * @returns {{type: 'success' | 'error', code: number, message: string}}
     */
    cleanCustomer: async (cu_id) => {
        try {
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            if (!customer.kubeconfig) return { type: 'error', code: 400, message: 'No kubeconfig uploaded' };

            await ProtectedApp.destroy({ where: {
                cu_id: cu_id,
                [sequelize.Op.or]: [
                { namespace: { [sequelize.Op.ne]: 'default' } },
                { application: { [sequelize.Op.ne]: 'default' } }
                ]
            } }); // Will automatically delete associated models in cascade (decoys, config, logs, apiKeys)

            const dpResponse = await cleanCluster(cu_id);
            
            return dpResponse;
        } catch (e) {
            throw e;
        }
    }
}
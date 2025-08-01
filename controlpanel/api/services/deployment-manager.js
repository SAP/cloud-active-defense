const axios = require('axios');
const Customer = require('../models/Customer');
const ApiKey = require('../models/Api-key');
const protectedAppService = require('./protected-app');
const ProtectedApp = require('../models/ProtectedApp');
const { isUUID } = require('../util');

module.exports = {
    /**
     * Install CloudActiveDefense to chosen customer's deployment app in the chosen namespace
     * @param {UUID} cu_id customer id
     * @param {string} deploymentAppName deployment app name
     * @param {string} namespace app namespace
     * @returns {{type: 'success' | 'error', code: number, data: Model, message: string}}
     */
    installCADToApp: async (cu_id, deploymentAppName, namespace) => {
        try {
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            const newProtectedApp = await protectedAppService.createProtectedApp({ namespace, application: deploymentAppName, cu_id });
            const responseEnvoy = await axios.put(`${process.env.DEPLOYMENT_MANAGER_URL}/envoy/reconfig`, { namespace, cu_id, deploymentName: deploymentAppName }, {validateStatus:_=>true} )
            if (responseEnvoy.data.type === 'success' && responseEnvoy.data.data) ApiKey.findOrCreate({ where: { key: responseEnvoy.data.data, permissions: ["configmanager"], pa_id: newProtectedApp.data.id }});
            else if (responseEnvoy.data.type !== 'success') return { ...responseEnvoy.data, message: `Something went wrong in deployment manager: ${responseEnvoy.data.message}` };
            const responseTelemetry = await axios.post(`${process.env.DEPLOYMENT_MANAGER_URL}/telemetry`, { namespace, cu_id, deploymentName: deploymentAppName }, {validateStatus:_=>true} )
            if (responseTelemetry.data.type === 'success' && responseTelemetry.data.data) ApiKey.findOrCreate({ where: { key: responseTelemetry.data.data, permissions: ["fluentbit"], pa_id: newProtectedApp.data.id }});
            else if (responseTelemetry.data.type !== 'success') return { ...responseTelemetry.data, message: `Something went wrong in deployment manager: ${responseTelemetry.data.message}` };
            return { type: 'success', code: 200, message: 'New application protected', data: newProtectedApp.data };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Get all namespaces for cutomer cluster
     * @param {UUID} cu_id customer id
     * @returns {{type: 'success' | 'error', code: number, data: Model[], message: string}}
     */
    getNamespaces: async(cu_id) => {
        try {
            if (!cu_id) return { type: 'error', code: 400, message: 'Customer ID is required' };
            if (!isUUID(cu_id)) return { type: 'error', code: 400, message: 'Invalid customer id supplied' };
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            
            const response = await axios.get(`${process.env.DEPLOYMENT_MANAGER_URL}/resources/namespaces/${cu_id}`, { validateStatus:_=>true } )
            if (response.data.type !== 'success') return { ...response.data, message: `Something went wrong in deployment manager: ${response.data.message}` };
            return { type: 'success', code: 200, message: 'Namespaces retrieved successfully', data: response.data.data };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Get all deployments in the chosen namespace for customer cluster
     * @param {UUID} cu_id customer id
     * @param {string} namespace app namespace
     * @returns {{type: 'success' | 'error', code: number, data: Model[], message: string}}
     */
    getDeployments: async (cu_id, namespace) => {
        try {
            if (!cu_id) return { type: 'error', code: 400, message: 'Customer ID is required' };
            if (!isUUID(cu_id)) return { type: 'error', code: 400, message: 'Invalid customer id supplied' };
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };
            if (!namespace) return { type: 'error', code: 400, message: 'Namespace is required' };
            if (!/^[a-zA-Z0-9-_]+$/.test(namespace)) return { type: 'error', code: 400, message: 'Invalid namespace supplied' };

            const response = await axios.get(`${process.env.DEPLOYMENT_MANAGER_URL}/resources/${namespace}/deployments/${cu_id}`, { validateStatus:_=>true } )
            if (response.data.type !== 'success') return { ...response.data, message: `Something went wrong in deployment manager: ${response.data.message}` };
            const protectedApps = await ProtectedApp.findAll({ where: { namespace, cu_id } });
            for (const deployment of response.data.data) {
                if (protectedApps.some(app => app.application === deployment.name)) {
                    deployment.protected = true;
                }
            }
            return { type: 'success', code: 200, message: 'Deployments retrieved successfully', data: response.data.data };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Clean the cluster with everything deployment manager installed
     * @param {UUID} cu_id customer id
     * @returns {{type: 'success' | 'error', code: number, message: string}}
     */
    cleanCluster: async (cu_id) => {
        try {            
            const response = await axios.delete(`${process.env.DEPLOYMENT_MANAGER_URL}/customer/${cu_id}`, { validateStatus:_=>true } )
            if (response.data.type !== 'success') return { ...response.data, message: `Something went wrong in deployment manager: ${response.data.message}` };
            return { type: 'success', code: 200, message: 'Cluster cleaned successfully' };
        } catch (e) {
            throw e;
        }
    },
    /**
     * Uninstall Cloud Active Defense from a specific application
     * @param {UUID} cu_id Customer ID
     * @param {string} deploymentAppName Name of the application deployment
     * @param {string} namespace Namespace of the application
     * @returns {{code: number, type: string, message: string}}
     */
    uninstallCADToApp: async (cu_id, deploymentAppName, namespace) => {
        try {
            if (!cu_id) return { code: 400, type: 'error', message: 'Customer ID is required' };
            if (!namespace) return { code: 400, type: 'error', message: 'Namespace is required' };
            if (!deploymentAppName) return { code: 400, type: 'error', message: 'Deployment name is required' };
            if (!isUUID(cu_id)) return { code: 400, type: 'error', message: 'Invalid customer ID, must be a valid UUID' };
            
            const customer = await Customer.findOne({ where: { id: cu_id } });
            if (!customer) return { type: 'error', code: 404, message: 'Customer not found' };

            const deletedProtectedAppNb = await ProtectedApp.destroy({ where: { namespace, application: deploymentAppName, cu_id }});
            if (deletedProtectedAppNb == 0) return { type: 'error', code: 404, message: 'Protected app not found' };
            
            const responseEnvoy = await axios.delete(`${process.env.DEPLOYMENT_MANAGER_URL}/envoy`, { data: { namespace, cu_id, deploymentName: deploymentAppName }, validateStatus:_=>true } )
            if (responseEnvoy.data.type !== 'success') return { ...responseEnvoy.data, message: `Something went wrong in deployment manager: ${responseEnvoy.data.message}` };
            const responseTelemetry = await axios.delete(`${process.env.DEPLOYMENT_MANAGER_URL}/telemetry`, { data: { namespace, cu_id, deploymentName: deploymentAppName }, validateStatus:_=>true } )
            if (responseTelemetry.data.type !== 'success') return { ...responseTelemetry.data, message: `Something went wrong in deployment manager: ${responseTelemetry.data.message}` };
            return { type: 'success', code: 200, message: 'Application uninstalled successfully' };
        } catch (e) {
            throw e;
        }
    }
}
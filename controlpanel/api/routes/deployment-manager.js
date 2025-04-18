const express = require('express');

const deploymentManagerService = require('../services/deployment-manager');

const router = express.Router();

router.post('/install/:cu_id', async (req, res) => {
    try {
        const result = await deploymentManagerService.installCADToApp(req.params.cu_id, req.body.deploymentAppName, req.body.namespace);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
router.get('/namespaces/:cu_id', async (req, res) => {
    try {
        const result = await deploymentManagerService.getNamespaces(req.params.cu_id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
router.get('/deployments/:cu_id/:namespace', async (req, res) => {
    try {
        const result = await deploymentManagerService.getDeployments(req.params.cu_id, req.params.namespace);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});

module.exports = router;
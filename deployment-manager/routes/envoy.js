const express = require('express');
const { installEnvoyWasm, reconfigEnvoy, renewApiKey } = require('../services/envoy');

const router = express.Router();

router.post('/wasm', async (req, res) => {
    try {
        const result = await installEnvoyWasm(req.body.kubeconfig, req.body.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});
router.put('/reconfig', async (req, res) => {
    try {
        const result = await reconfigEnvoy(req.body.kubeconfig, req.body.deploymentName, req.body.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});
router.post('/renew-apikey', async (req, res) => {
    try {
        const result = await renewApiKey(req.body.kubeconfig, req.body.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
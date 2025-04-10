const express = require('express');
const { installTelemetry, renewApiKey } = require('../services/telemetry');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const result = await installTelemetry(req.body.kubeconfig, req.body.namespace);
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
const express = require('express');

const logsService = require('../services/logs');
const fluentAuth = require('../middleware/fluentbit-authentication');

const router = express.Router();

router.get('/:pa_id', async (req, res) => {
    try {
        const result = await logsService.getLogs(req.params.pa_id, req.query);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({code: 500, type: 'error', message: "Server error" });
    }
})

router.post('/', fluentAuth, async (req, res) => {
    try {
        const result = await logsService.createLogs(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
})

module.exports = router;
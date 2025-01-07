const express = require('express');

const logsService = require('../services/logs');

const router = express.Router();

router.post('/:type', async (req, res) => {
    try {
        const filter = { type: req.params.type, ...req.body.filter };

        const result = await logsService.getLogs(filter);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})

router.post('/', async (req, res) => {
    try {
        const result = await logsService.createLogs(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
})

module.exports = router;
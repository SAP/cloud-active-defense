const express = require('express');

const configService = require('../services/config');

const router = express.Router();

router.get('/:pa_id', async (req, res) => {
    try {
        const result = await configService.getConfig(req.params['pa_id']);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/', async (req, res) => {
    try {
        const result = await configService.updateConfig(req.body);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
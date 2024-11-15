const express = require('express');

const configService = require('../services/config');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await configService.getConfig();
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/', async (req, res) => {
    try {
        const result = await configService.updateConfig(req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})

module.exports = router;
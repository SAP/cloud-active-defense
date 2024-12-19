const express = require('express');
const configmanagerService = require('../services/configmanager');

const router = express.Router();

router.get('/decoys/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getDecoysList(namespace, application);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/decoys/:pa_id', async (req, res) => {
    try {
        const result = await configmanagerService.updateDecoysList(req.params.pa_id, req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: "Server error", data: e });
    }
});

router.get('/config/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getConfig(namespace, application);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/config/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.updateConfig(namespace, application, req.body);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})

router.get('/sync', async (req, res) => {
    try {
        const result = await configmanagerService.sendDataToConfigmanager();
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})


module.exports = router;
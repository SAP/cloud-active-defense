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
        return res.status(500).send({ type: 'error', code: 500, message:"Server error" });
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
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: "Server error", data: e });
    }
});

router.put('/config/:pa_id', async (req, res) => {
    try {
        const result = await configmanagerService.updateConfig(req.params.pa_id);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: "Server error", data: e });
    }
})

router.get('/sync', async (req, res) => {
    try {
        const result = await configmanagerService.sendDataToConfigmanager();
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: "Server error", data: e });
    }
})


module.exports = router;
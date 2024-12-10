const express = require('express');
const configmanagerService = require('../services/configmanager');

const router = express.Router();

router.get('/decoys/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getDecoysList(namespace, application);
        if (result.type == 'error') {
            return res.status(result.code).send(result);
        }
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/decoys/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.updateDecoysList(namespace, application, req.body);
        if (result.type == 'error') {
            return res.status(500).send(result);
        }
        return res.status(200).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});


module.exports = router;
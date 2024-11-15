const express = require('express');
const decoysService = require('../services/decoys');

const router = express.Router();

router.get('/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await decoysService.getDecoysList(namespace, application);
        if (result.type == 'error') {
            return res.status(result.code).send(result.message);
        }
        return res.status(result.code).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await decoysService.updateDecoysList(namespace, application, req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});


module.exports = router;
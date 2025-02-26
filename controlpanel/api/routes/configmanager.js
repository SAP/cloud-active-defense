const express = require('express');
const configmanagerService = require('../services/configmanager');

const router = express.Router();

router.get('/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getActiveDecoysConfig(namespace, application);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
router.post('/blocklist/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.setBlocklist(namespace, application, req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
router.get('/blocklist/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getBlocklist(namespace, application);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});

module.exports = router;
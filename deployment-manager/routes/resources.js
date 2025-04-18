const express = require('express');
const { getNamespaces, getDeployments } = require('../services/resources');

const router = express.Router();

router.get('/namespaces/:cu_id', async (req, res) => {
    try {
        const result = await getNamespaces(req.params.cu_id);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

router.get('/:namespace/deployments/:cu_id', async (req, res) => {
    try {
        const result = await getDeployments(req.params.cu_id, req.params.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
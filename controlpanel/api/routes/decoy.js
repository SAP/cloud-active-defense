const express = require('express');
const decoyService = require('../services/decoy');

const router = express.Router();

router.get('/:id', async (req, res) => {
    try {
        const result = await decoyService.findDecoyById(req.params.id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error", data: e };
    }
});

router.post('/', async (req, res) => {
    try {
        const result = await decoyService.createDecoy(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error", data: e };
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await decoyService.deleteDecoy(req.params.id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error", data: e };
    }
});

router.put('/:id', async (req, res) => {
    try {
        const result = await decoyService.updateDecoy(req.params.id, req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error", data: e };
    }
});

module.exports = router;
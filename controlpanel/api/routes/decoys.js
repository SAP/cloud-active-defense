const express = require('express');
const decoysService = require('../services/decoys');

const router = express.Router();

router.get('/:pa_id', async (req, res) => {
    try {
        const result = await decoysService.getDecoysList(req.params.pa_id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error', data: e });

    }
});

router.patch('/state', async (req, res) => {
    try {
        const result = await decoysService.updateDecoysStates(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error', data: e });
    }
});

router.post('/', async (req, res) => {
    try {
        const result = await decoysService.createDecoy(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error', data: e });
    }
});

module.exports = router;
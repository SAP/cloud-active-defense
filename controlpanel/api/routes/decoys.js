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

module.exports = router;
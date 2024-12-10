const express = require('express');

const protectedAppService = require('../services/protected-app');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await protectedAppService.getProtectedApps();
        if (result.type == 'error') {
            return res.status(500).send(result);
        }
        return res.status(200).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})

module.exports = router;
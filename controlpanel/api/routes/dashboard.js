const express = require('express');

const dashboardService = require('../services/dashboard');

const router = express.Router();

router.get('/:userId', async (req, res) => {
    try {
        const result = await dashboardService.getDashboard(req.params.userId);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/:userId', async (req, res) => {
    try {
        const result = dashboardService.updateDashboard(req.params.userId, req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});
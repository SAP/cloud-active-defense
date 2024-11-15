const express = require('express');

const statisticsService = require('../services/statistics');

const router = express.Router();

router.get('/:date', async (req, res) => {
    try {
        const result = await statisticsService.calculateStatisticsOfAlertsFromDate(req.params.date);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
})

module.exports = router;
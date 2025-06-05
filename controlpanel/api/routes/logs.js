const express = require('express');

const logsService = require('../services/logs');
const fluentAuth = require('../middleware/fluentbit-authentication');

const router = express.Router();

/**
 * @swagger
 * /logs/{pa_id}:
 *   get:
 *     summary: List of logs for a protected app
 *     tags: ['Logs']
 *     parameters:
 *       - in: path
 *         name: pa_id
 *         required: true
 *         description: ID of the protected app
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *       - in: query
 *         name: type
 *         required: false
 *         description: Type of the logs
 *         schema:
 *           type: string
 *           enum: [alert, event, applog]
 *           example: alert
 *     responses:
 *       200:
 *         description: List of logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Logs'
 *       400:
 *         description: Invalid pa_id supplied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid pa_id supplied
 */
router.get('/:pa_id', async (req, res) => {
    try {
        const result = await logsService.getLogs(req.params.pa_id, req.query);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({code: 500, type: 'error', message: "Server error" });
    }
})


/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Create logs
 *     tags: ['Logs']
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 date:
 *                   type: number
 *                   format: timestamp
 *                   example: 1672531199
 *                 log:
 *                   type: string
 *                   format: json
 *                   example: '{"type": "alert", "content": "read new config"}'
 *                 namespace:
 *                   type: string
 *                   example: "demo-ns"
 *                 application:
 *                   type: string
 *                   example: "myapp"
 *     responses:
 *       200:
 *         description: Logs created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       log:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: number
 *                             format: timestamp
 *                             example: 1672531199
 *                           log:
 *                             type: string
 *                             format: json
 *                             example: '{"type": "alert", "content": "read new config"}'
 *                           namespace:
 *                             type: string
 *                             example: "demo-ns"
 *                           application:
 *                             type: string
 *                             example: "myapp"
 *                           errors:
 *                             type: array
 *                             items:
 *                               type: string
 *                               example: "Protected app not found"
 *       400:
 *         description: No logs provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: No logs provided
 */
router.post('/', fluentAuth, async (req, res) => {
    try {
        const result = await logsService.createLogs(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
})

module.exports = router;
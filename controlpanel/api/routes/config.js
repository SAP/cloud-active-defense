const express = require('express');

const configService = require('../services/config');

const router = express.Router();

/**
 * @swagger
 * /config/{pa_id}:
 *   get:
 *    summary: Get config for a protected app
 *    tags: [Config]
 *    parameters:
 *      - name: pa_id
 *        in: path
 *        required: true
 *        description: The UUID of the protected app
 *        schema:
 *          type: string
 *          example: 123e4567-e89b-12d3-a456-426614174001
 *    responses:
 *      200:
 *        description: Config found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 code:
 *                   type: integer
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *                 data:
 *                   $ref: '#/components/schemas/ConfigData'
 *      404:
 *        description: Config not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                  enum: [error]
 *                  example: error
 *                code:
 *                  type: integer
 *                  enum: [404]
 *                  example: 404
 *                message:
 *                  type: string
 *                  example: No config found for this app
 *      400:
 *        description: Invalid pa_id supplied
 *        content:
 *          application/json:       
 *            schema:
 *              type: object
 *              properties:
 *                type:
 *                  type: string
 *                  enum: [error]
 *                  example: error
 *                code:
 *                  type: integer
 *                  enum: [400]
 *                  example: 400
 *                message:
 *                  type: string
 *                  example: Invalid pa_id supplied
 *  
 * 
 * 
 * 
 */
router.get('/:pa_id', async (req, res) => {
    try {
        const result = await configService.getConfig(req.params['pa_id']);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});

/**
 * @swagger
 * /config:
 *   put:
 *     summary: Update config for a protected app
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pa_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *               config:
 *                 $ref: '#/components/schemas/Config'
 *     responses:
 *       200:
 *         description: Config updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 code:
 *                   type: integer
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *       201:
 *         description: Config created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 code:
 *                   type: integer
 *                   enum: [201]
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *                 data:
 *                   $ref: '#/components/schemas/ConfigData'
 *       422:
 *         description: Unprocessable entity
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: integer
 *                       enum: [422]
 *                       example: 422
 *                     message:
 *                       type: string
 *                       example: Payload should be a json
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: integer
 *                       enum: [422]
 *                       example: 422
 *                     message:
 *                       type: string
 *                       example: Config is not an object
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: integer
 *                       enum: [422]
 *                       example: 422
 *                     message:
 *                       type: string
 *                       example: Bad json provided, there are errors in the config object
 *                     data:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: .in needs to be cookie or header
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: integer
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: No protectedApp id provided
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: integer
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: Invalid protectedApp id provided
 */
router.put('/', async (req, res) => {
    try {
        const result = await configService.updateConfig(req.body);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error'});
    }
});

module.exports = router;
const express = require('express');
const decoyService = require('../services/decoy');

const router = express.Router();

/**
 * @swagger
 * /decoy/{id}:
 *   get:
 *     summary: Get a decoy by id
 *     tags: [Decoy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the decoy to retrieve
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: A decoy object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [200]
 *                   example: 200
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                    type: string
 *                    example: Successful operation
 *                 data:
 *                   $ref: '#/components/schemas/DecoyData'
 *       400:
 *         description: Invalid id supplied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid id supplied
 *       404:
 *         description: Decoy not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Decoy not found
 */
router.get('/:id', async (req, res) => {
    try {
        const result = await decoyService.findDecoyById(req.params.id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error" };
    }
});

/**
 * @swagger
 * /decoy:
 *   post:
 *     summary: Create a new decoy
 *     tags: [Decoy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pa_id:
 *                 type: string
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               decoy:
 *                 $ref: '#/components/schemas/Decoy'
 *     responses:    
 *       201:
 *        description: Decoy created successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                code:
 *                  type: integer
 *                  enum: [201]
 *                  example: 201
 *                type:
 *                  type: string
 *                  enum: [success]
 *                  example: success
 *                message:
 *                  type: string
 *                  example: Successful operation
 *                data:
 *                  $ref: '#/components/schemas/DecoyData'
 *       422:
 *        description: Unprocessable entity
 *        content:
 *          application/json:
 *           schema:
 *             oneOf:
 *             - type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [422]
 *                   example: 422
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Payload should be a json
 *             - type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [422]
 *                   example: 422
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Bad json provided, there are errors in the decoy object
 *                 data:
 *                  type: array
 *                  items:
 *                    type: string
 *                    example: .decoy attribute is mandatory
 *             - type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [422]
 *                   example: 422
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Decoy is not an object
 *       400:
 *        description: Bad request
 *        content:
 *          application/json:
 *           schema:
 *             oneOf:
 *             - type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: No protected app id provided
 *             - type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid protectedApp id provided
 */
router.post('/', async (req, res) => {
    try {
        const result = await decoyService.createDecoy(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error" };
    }
});

/**
 * @swagger
 * /decoy/{id}:
 *   delete:
 *     summary: Delete a decoy by id
 *     tags: [Decoy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the decoy to delete
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Decoy deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [200]
 *                   example: 200
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *       404:
 *         description: Decoy not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Decoy not found
 *       400:
 *         description: Invalid decoy id supplied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid decoy id supplied
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await decoyService.deleteDecoy(req.params.id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error" };
    }
});

/**
 * @swagger
 * /decoy/{id}:
 *   put:
 *     summary: Update a decoy by id
 *     tags: [Decoy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The id of the decoy to update
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Decoy'
 *     responses:
 *       200:
 *         description: Decoy updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [200]
 *                   example: 200
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *       422:
 *         description: Unprocessable entity
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [422]
 *                       example: 422
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Payload should be a json
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [422]
 *                       example: 422
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Bad json provided, there are errors in the decoy object
 *       400:
 *         description: Invalid decoy id supplied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid decoy id supplied
 *       404:
 *         description: Decoy not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Decoy not found
 */
router.put('/:id', async (req, res) => {
    try {
        const result = await decoyService.updateDecoy(req.params.id, req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error" };
    }
});

/**
 * @swagger
 * /decoy/state:
 *   patch:
 *    summary: Update the deploy state of a decoy
 *    tags: [Decoy]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *                format: uuid
 *                example: 123e4567-e89b-12d3-a456-426614174000
 *              deployed:
 *                type: boolean
 *                example: true
 *    responses:
 *      200:
 *        description: Decoy deploy state updated successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                code:
 *                  type: integer
 *                  enum: [200]
 *                  example: 200
 *                type:
 *                  type: string
 *                  enum: [success]
 *                  example: success
 *                message:
 *                  type: string
 *                  example: Successful operation
 *      422:
 *        description: Unprocessable entity
 *        content:
 *          application/json:
 *            schema:
 *              oneOf:
 *                - type: object
 *                  properties:
 *                    code:
 *                      type: integer
 *                      enum: [422]
 *                      example: 422
 *                    type:
 *                      type: string
 *                      enum: [error]
 *                      example: error
 *                    message:
 *                      type: string
 *                      example: Payload should be a json
 *                - type: object
 *                  properties:
 *                    code:
 *                      type: integer
 *                      enum: [422]
 *                      example: 422
 *                    type:
 *                      type: string
 *                      enum: [error]
 *                      example: error
 *                    message:
 *                      type: string
 *                      example: No decoy id provided
 *                - type: object
 *                  properties:
 *                    code:
 *                      type: integer
 *                      enum: [422]
 *                      example: 422
 *                    type:
 *                      type: string
 *                      enum: [error]
 *                      example: error
 *                    message:
 *                      type: string
 *                      example: No deploy state provided
 *      400:
 *        description: Invalid decoy id supplied
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                code:
 *                  type: integer
 *                  enum: [400]
 *                  example: 400
 *                type:
 *                  type: string
 *                  enum: [error]
 *                  example: error
 *                message:
 *                  type: string
 *                  example: Invalid decoy id supplied
 *      404:
 *        description: Decoy not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                code:
 *                  type: integer
 *                  enum: [404]
 *                  example: 404
 *                type:
 *                  type: string
 *                  enum: [error]
 *                  example: error
 *                message:
 *                  type: string
 *                  example: Decoy not found
 */
router.patch('/state', async (req, res) => {
    try {
        const result = await decoyService.updateDecoyDeployState(req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return { type: 'error', code: 500, message: "Server error" };
    }
});

module.exports = router;
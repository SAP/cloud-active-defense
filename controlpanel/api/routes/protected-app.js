const express = require('express');

const protectedAppService = require('../services/protected-app');
const { authorizationFromCu_id } = require('../middleware/customer-authorization');

const router = express.Router();

/**
 * @swagger
 * /protected-app:
 *   get:
 *     summary: Get all protected apps
 *     tags: [ProtectedApp]
 *     responses:
 *       200:
 *         description: A list of protected apps
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
 *                   enum: [success, error]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Successful operation
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProtectedApp'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [500]
 *                   example: 500
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Server error
 */

router.get('/', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await protectedAppService.getProtectedApps(req.cu_id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
})

/**
 * @swagger
 * /protected-app:
 *   post:
 *     summary: Create a new protected app and copy decoys and configs from default protected app
 *     tags: [ProtectedApp]
 *     requestBody:
 *       description: Protected app object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               namespace:
 *                 type: string
 *                 example: demo-ns
 *               application:
 *                 type: string
 *                 example: myapp
 *               cu_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       201:
 *         description: Protected app created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [201]
 *                   example: 201
 *                 type:
 *                   type: string
 *                   enum: [success]
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: successful operation
 *                 data:
 *                   $ref: '#/components/schemas/ProtectedApp'
 *       422:
 *         description: Payload should be a json
 *         content:
 *           application/json:
 *             schema:
 *               type: object
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
 *       400:
 *         description: namespace and/or application are missing
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
 *                   example: namespace and/or application are missing
 *       409:
 *         description: Protected app already exists, cannot create protected app duplicates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   enum: [409]
 *                   example: 409
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Protected app already exists, cannot create protected app duplicates
 *                 data:
 *                   $ref: '#/components/schemas/ProtectedApp'
 */
router.post('/', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await protectedAppService.createProtectedApp({...req.body, cu_id: req.cu_id});
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: "Server error" });
    }
})

module.exports = router;
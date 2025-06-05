const express = require('express');
const { installEnvoyWasm, reconfigEnvoy, renewApiKey } = require('../services/envoy');

const router = express.Router();

/**
 * @swagger
 * /envoy/wasm:
 *   post:
 *     summary: Install Envoy Wasm
 *     tags: [Envoy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cu_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *               namespace:
 *                 type: string
 *                 example: demo-ns
 *     responses:
 *       200:
 *         description: Envoy Wasm installed successfully
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
 *                   example: Envoy Wasm installed successfully
 *       404:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Customer does not exist
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: No kubeconfig provided for customer
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace not found
 *       400:
 *        description: Bad request
 *        content:
 *          application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     enum: [404]
 *                     example: 404
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   message:
 *                     type: string
 *                     example: Customer ID is required
 *               - type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     enum: [404]
 *                     example: 404
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   message:
 *                     type: string
 *                     example: Namespace is required
 *               - type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     enum: [404]
 *                     example: 404
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   message:
 *                     type: string
 *                     example: Invalid customer ID, must be a valid UUID
 *               - type: object
 *                 properties:
 *                   code:
 *                     type: integer
 *                     enum: [404]
 *                     example: 404
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   message:
 *                     type: string
 *                     example: Invalid namespace, must be a valid Kubernetes name format
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Could not connect to the cluster with provided kubeconfig
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to install Wasm: Could not create persistent volume claim
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to install Wasm: Could not create init job
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to install Wasm: Could not create controlpanel service
 */
router.post('/wasm', async (req, res) => {
    try {
        const result = await installEnvoyWasm(req.body.cu_id, req.body.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});
/**
 * @swagger
 * /envoy/reconfig:
 *   put:
 *     summary: Reconfigure Envoy
 *     tags: [Envoy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cu_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *               deploymentName:
 *                 type: string
 *                 example: myapp
 *               namespace:
 *                 type: string
 *                 example: demo-ns
 *     responses:
 *       200:
 *         description: Envoy reconfigured successfully
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
 *                   example: Envoy reconfigured successfully
 *       404:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Customer does not exist
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: No kubeconfig provided for customer
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace not found
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Deployment not found
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Customer ID is required
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace is required
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Deployment name is required
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Invalid customer ID, must be a valid UUID
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Invalid namespace, must be a valid Kubernetes name format
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Invalid deployment name, must be a valid Kubernetes name format
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Could not connect to the cluster with provided kubeconfig
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Wasm volume is missing, tried to install but got error
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to install wasm: Could not create envoy filter
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to install wasm: Could not patch deployment ...
 */
router.put('/reconfig', async (req, res) => {
    try {
        const result = await reconfigEnvoy(req.body.cu_id, req.body.deploymentName, req.body.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});
/**
 * @swagger
 * /envoy/renew-apikey:
 *   post:
 *     summary: Renew Envoy API key
 *     tags: [Envoy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cu_id:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *               namespace:
 *                 type: string
 *                 example: demo-ns
 *     responses:
 *       200:
 *         description: Envoy API key renewed successfully
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
 *                   example: Envoy API key renewed successfully
 *                 data:
 *                   type: string
 *                   example: A1b2C3d4E5f6G7h8I9j0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g
 *       404:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Customer does not exist
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: No kubeconfig provided for customer
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace not found
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Deployment not found
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace not found
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Customer ID is required
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Namespace is required
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Invalid customer ID, must be a valid UUID
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [404]
 *                       example: 404
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Invalid namespace, must be a valid Kubernetes name format
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Could not connect to the cluster with provided kubeconfig
 *                 - type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       enum: [500]
 *                       example: 500
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: |
 *                         Failed to renew API key for envoy: Could not patch envoy config                
 */
router.post('/renew-apikey', async (req, res) => {
    try {
        const result = await renewApiKey(req.body.cu_id, req.body.namespace, req.body.deploymentName);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
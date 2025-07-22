const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/kubeconfig/',limits: {fileSize: 1_000_000} });
const keycloak = require('../config/keycloak');
const keycloakAuth = require('../middleware/keycloak-authentication');

const customerService = require('../services/customer');
const { authorizationFromCu_id } = require('../middleware/customer-authorization');

const router = express.Router();

/**
 * @swagger
 * /customer/upload-kubeconfig:
 *   post:
 *     summary: Upload kubeconfig for a customer
 *     tags: [Customer]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               kubeconfig:
 *                 type: string
 *                 format: binary
 *                 description: The kubeconfig file to upload
 *     responses:
 *       200:
 *         description: Kubeconfig uploaded successfully
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
 *                   example: Kubeconfig uploaded successfully
 *       400:
 *         description: No kubeconfig provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: No kubeconfig provided
 *       404:
 *         description: Customer not found
 *         content:   
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Customer not found
 */
router.post('/upload-kubeconfig', keycloak.protect(), authorizationFromCu_id, upload.single('kubeconfig'), async (req, res) => {
    try {
        const result = await customerService.uploadKubeconfig(req.cu_id, req.file.path);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});
/**
 * @swagger
 * /customer:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme.com
 *     responses:
 *       200:
 *         description: Customer created successfully
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
 *                   example: Customer created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 */
router.post('/', keycloakAuth, async (req, res) => {
    try {
        const result = await customerService.createCustomer(req.body.name);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});
/**
 * @swagger
 * /customer/clean:
 *   delete:
 *     summary: Clean up customer data and cluster
 *     tags: [Customer]
 *     responses:
 *       200:
 *         description: Cluster cleaned successfully
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
 *                   example: Cluster cleaned successfully
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [error]
 *                   example: error
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Customer not found
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [400]
 *                     example: 400
 *                   message:
 *                     type: string
 *                     example: No kubeconfig uploaded
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [400]
 *                     example: 400
 *                   message:
 *                     type: string
 *                     example: Customer ID is required
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [400]
 *                     example: 400
 *                   message:
 *                     type: string
 *                     example: Invalid customer ID, must be a valid UUID
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [500]
 *                     example: 500
 *                   message:
 *                     type: string
 *                     example: Cluster must be a Kyma cluster, cannot continue
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [500]
 *                     example: 500
 *                   message:
 *                     type: string
 *                     example: Could not connect to cluster with provided kubeconfig
 *               - type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [error]
 *                     example: error
 *                   code:
 *                     type: integer
 *                     enum: [500]
 *                     example: 500
 *                   message:
 *                     type: string
 *                     example: |
 *                       Not all the namespaces could be cleaned: Could not clean the following namespaces: ...
 */
router.delete('/clean', keycloak.protect(), authorizationFromCu_id, async (req, res) => {
    try {
        const result = await customerService.cleanCustomer(req.cu_id);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/kubeconfig/',limits: {fileSize: 1_000_000} });
const keycloak = require('../config/keycloak');

const customerService = require('../services/customer');

const router = express.Router();

/**
 * @swagger
 * /customer/{cu_id}/upload-kubeconfig:
 *   post:
 *     summary: Upload kubeconfig for a customer
 *     tags: [Customer]
 *     parameters:
 *       - name: cu_id
 *         in: path
 *         required: true
 *         description: The UUID of the customer
 *         schema:
 *           type: string
 *           example: 123e4567-e89b-12d3-a456-426614174001
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
router.post('/:id/upload-kubeconfig', keycloak.protect(), upload.single('kubeconfig'), async (req, res) => {
    try {
        const result = await customerService.uploadKubeconfig(req.params.id, req.file.path);
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
router.post('/', async (req, res) => {
    try {
        const result = await customerService.createCustomer(req.body.name);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});

module.exports = router;
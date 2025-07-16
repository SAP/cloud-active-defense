const express = require('express');
const { cleanCluster } = require('../services/customer');

const router = express.Router();

/**
 * @swagger
 * /customer/{cu_id}:
 *   delete:
 *     summary: Clean up customer cluster
 *     tags: [Customer]
 *     parameters:
 *       - in: path
 *         name: cu_id
 *         required: true
 *         description: The id of the customer
 *         schema:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
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
router.delete('/:cu_id', async (req, res) => {
    try {
        const result = await cleanCluster(req.params.cu_id);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
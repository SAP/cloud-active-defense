const express = require('express');
const { getNamespaces, getDeployments } = require('../services/resources');

const router = express.Router();

/**
 * @swagger
 * /resources/namespaces/{cu_id}:
 *   get:
 *     summary: Get list of namespaces for customer
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: cu_id
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
 *     responses:
 *       200:
 *         description: List of namespaces
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
 *                   example: Successfully retrieved namespaces
 *                 data:
 *                   type: array
 *                   items:
 *                    type: string
 *                    example: demo-ns
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
 *                       example: No namespace found
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
 */
router.get('/namespaces/:cu_id', async (req, res) => {
    try {
        const result = await getNamespaces(req.params.cu_id);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

/**
 * @swagger
 * /resources/{namespace}/deployments/{cu_id}:
 *   get:
 *     summary: Get list of deployments for customer in a namespace
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: namespace
 *         required: true
 *         description: Namespace to get deployment from
 *         schema:
 *           type: string
 *           example: demo-ns
 *       - in: path
 *         name: cu_id
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: string
 *           format: uuid
 *           example: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
 *     responses:
 *       200:
 *         description: List of deployments
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: 
 *                       type: string
 *                       example: myapp
 *                     maxReplicas:
 *                       type: integer
 *                       example: 2
 *                     currentReplicas:
 *                       type: integer
 *                       example: 1
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
 *                       example: No deployment found
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
 */
router.get('/:namespace/deployments/:cu_id', async (req, res) => {
    try {
        const result = await getDeployments(req.params.cu_id, req.params.namespace);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
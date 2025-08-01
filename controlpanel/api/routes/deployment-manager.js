const express = require('express');

const deploymentManagerService = require('../services/deployment-manager');
const { authorizationFromCu_id } = require('../middleware/customer-authorization');

const router = express.Router();

/**
 * @swagger
 * /deployment-manager/install:
 *   post:
 *     summary: Install Cloud Active Defense to existing application
 *     tags: [Deployment Manager]
 *     requestBody:
 *       required: true
 *       description: The name of the deployment app and the namespace
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deploymentAppName:
 *                 type: string
 *                 pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
 *                 maxLength: 63
 *                 description: The name of the deployment app
 *                 example: myapp
 *               namespace:
 *                 type: string
 *                 pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
 *                 maxLength: 63
 *                 description: The namespace of the deployment app
 *                 example: demo-ns
 *     responses:
 *       200:
 *         description: New application protected
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
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: New application protected
 *       404:
 *         description: Not found
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
 *                       type: number
 *                       enum: [404]
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: Customer not found
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [404]
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: |
 *                         Something went wrong in deployment manager: <message>
 *       400:
 *         description: Something went wrong in deployment manager
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
 *                   type: number
 *                   enum: [400]
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: | 
 *                     Something went wrong in deployment manager: <message>
 */
router.post('/install', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await deploymentManagerService.installCADToApp(req.cu_id, req.body.deploymentAppName, req.body.namespace);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
/**
 * @swagger
 * /deployment-manager/namespaces:
 *   get:
 *     summary: Get all namespaces for customer cluster
 *     tags: [Deployment Manager]
 *     responses:
 *       200:
 *         description: Namespaces retrieved successfully
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
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Namespaces retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: demo-ns
 *       404:
 *         description: Something went wrong in deployment manager
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
 *                   type: number
 *                   enum: [404]
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: |
 *                     Something went wrong in deployment manager: <message>
 *       400:
 *         description: Something went wrong in deployment manager
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
 *                   type: number
 *                   enum: [400]
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: | 
 *                     Something went wrong in deployment manager: <message>
 *       500:
 *         description: |
 *           Something went wrong in deployment manager: Could not connect to cluster with provided kubeconfig
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
 *                   type: number
 *                   enum: [500]
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: | 
 *                     Something went wrong in deployment manager: Could not connect to cluster with provided kubeconfig
 */
router.get('/namespaces', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await deploymentManagerService.getNamespaces(req.cu_id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
/**
 * @swagger
 * /deployment-manager/deployments/{namespace}:
 *   get:
 *     summary: Get all namespaces for customer cluster
 *     tags: [Deployment Manager]
 *     parameters:
 *       - in: path
 *         name: namespace
 *         required: true
 *         description: The name of the deployment app and the namespace
 *         schema:
 *           type: string
 *           pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
 *           maxLength: 63
 *           description: The namespace of the deployment app
 *           example: demo-ns
 *     responses:
 *       200:
 *         description: Deployments retrieved successfully
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
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Deployments retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: myapp
 *                       protected:
 *                         type: boolean
 *                         example: true
 *                       maxReplicas:
 *                         type: number
 *                         example: 3
 *                       currentReplicas:
 *                         type: number
 *                         example: 2
 *       404:
 *         description: Something went wrong in deployment manager
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
 *                   type: number
 *                   enum: [404]
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: |
 *                     Something went wrong in deployment manager: <message>
 *       400:
 *         description: Something went wrong in deployment manager
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
 *                   type: number
 *                   enum: [400]
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: | 
 *                     Something went wrong in deployment manager: <message>
 *       500:
 *         description: |
 *           Something went wrong in deployment manager: Could not connect to cluster with provided kubeconfig
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
 *                   type: number
 *                   enum: [500]
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: | 
 *                     Something went wrong in deployment manager: Could not connect to cluster with provided kubeconfig
 */
router.get('/deployments/:namespace', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await deploymentManagerService.getDeployments(req.cu_id, req.params.namespace);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
/**
 * @swagger
 * /deployment-manager/uninstall:
 *   delete:
 *     summary: Uninstall Cloud Active Defense from chosen application
 *     tags: [Deployment Manager]
 *     requestBody:
 *       required: true
 *       description: The name of the deployment app and the namespace
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deploymentAppName:
 *                 type: string
 *                 pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
 *                 maxLength: 63
 *                 description: The name of the deployment app
 *                 example: myapp
 *               namespace:
 *                 type: string
 *                 pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/
 *                 maxLength: 63
 *                 description: The namespace of the deployment app
 *                 example: demo-ns
 *     responses:
 *       200:
 *         description: Application uninstalled successfully
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
 *                   type: number
 *                   enum: [200]
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Application uninstalled successfully
 *       404:
 *         description: Not found
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
 *                       type: number
 *                       enum: [404]
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: Customer not found
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [404]
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: Protected app not found
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [404]
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: |
 *                         Something went wrong in deployment manager: <message>
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
 *                       type: number
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: | 
 *                         Something went wrong in deployment manager: <message>
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: Customer ID is required
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: Namespace is required
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: Deployment name is required
 *                 - type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [error]
 *                       example: error
 *                     code:
 *                       type: number
 *                       enum: [400]
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: Invalid customer ID, must be a valid UUID
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
 *                   example: |
 *                     Something went wrong in deployment manager: <message>
 */
router.delete('/uninstall', authorizationFromCu_id, async (req, res) => {
    try {
        const result = await deploymentManagerService.uninstallCADToApp(req.cu_id, req.body.deploymentAppName, req.body.namespace);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});

module.exports = router;
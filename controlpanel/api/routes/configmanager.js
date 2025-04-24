const express = require('express');
const configmanagerService = require('../services/configmanager');

const router = express.Router();

/**
 * @swagger
 * /configmanager/{namespace}/{application}:
 *   get:
 *     summary: Get active decoys and config for a protected app
 *     tags: [Configmanager]
 *     parameters:
 *       - in: path
 *         name: namespace
 *         required: true
 *         description: Namespace of the protected app
 *         schema:
 *           type: string
 *           example: demo-ns
 *       - in: path
 *         name: application
 *         required: true
 *         description: Application of the protected app
 *         schema:
 *           type: string
 *           example: myapp
 *     responses:
 *       200:
 *         description: Decoys and config for the protected app
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     config:
 *                       $ref: "#/components/schemas/Config"
 *                     decoys:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/Decoy"
 *       400:
 *         description: Invalid namespace or application supplied
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
 *                   example: Invalid namespace or application supplied
 *       404:
 *         description: Invalid namespace or application supplied
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
 *                   example: Invalid namespace or application supplied
 */
router.get('/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getActiveDecoysConfig(namespace, application);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
/**
 * @swagger
 * /configmanager/blocklist/{namespace}/{application}:
 *   post:
 *     summary: Set blocklist and throttle list for a protected app
 *     tags: [Configmanager]
 *     parameters:
 *       - in: path
 *         name: namespace
 *         required: true
 *         description: Namespace of the protected app
 *         schema:
 *           type: string
 *           example: demo-ns
 *       - in: path
 *         name: application
 *         required: true
 *         description: Application of the protected app
 *         schema:
 *           type: string
 *           example: myapp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blocklist:
 *                 type: array
 *                 items:
 *                   $ref: "#/components/schemas/Blocklist"
 *               throttle:
 *                 type: array
 *                 items:
 *                   $ref: "#/components/schemas/Blocklist"
 *     responses:
 *       200:
 *         description: Blocklist and throttle list set successfully
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
 *                       example: Invalid namespace or application supplied
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
 *                       example: Invalid blocklist supplied
 *       404:
 *         description: Invalid namespace or application supplied
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
 *                   example: Invalid namespace or application supplied
 */
router.post('/blocklist/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.setBlocklist(namespace, application, req.body);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});
/**
 * @swagger
 * /configmanager/blocklist/{namespace}/{application}:
 *   get:
 *     summary: Get blocklist and throttle list for a protected app
 *     tags: [Configmanager]
 *     parameters:
 *       - in: path
 *         name: namespace
 *         required: true
 *         description: Namespace of the protected app
 *         schema:
 *           type: string
 *           example: demo-ns
 *       - in: path
 *         name: application
 *         required: true
 *         description: Application of the protected app
 *         schema:
 *           type: string
 *           example: myapp
 *     responses:
 *       200:
 *         description: Blocklist and throttle list for the protected app
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/BlocklistData"
 *       400:
 *         description: Invalid namespace or application supplied
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
 *                   example: Invalid namespace or application supplied
 *       404:
 *         description: Invalid namespace or application supplied
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
 *                   example: Invalid namespace or application supplied
 * 
 */
router.get('/blocklist/:namespace/:application', async (req, res) => {
    try {
        const { namespace, application } = req.params;
        const result = await configmanagerService.getBlocklist(namespace, application);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });
    }
});

module.exports = router;
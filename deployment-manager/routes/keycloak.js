const express = require('express');
const { createApiKey } = require('../services/keycloak');

const router = express.Router();

/**
 * @swagger
 * /keycloak/apikey:
 *   post:
 *     summary: Create Keycloak API key
 *     tags: [Keycloak]
 *     responses:
 *       200:
 *         description: Keycloak API key created successfully
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
 *                   example: Keycloak API key created successfully
 *                 data:
 *                   type: string
 *                   example: A1b2C3d4E5f6G7h8I9j0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g
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
 *                       example: Could not connect to the current cluster
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
 *                         Failed to create API key for keycloak: Could not patch keycloak secret                
 */
router.post('/apikey', async (req, res) => {
    try {
        const result = await createApiKey();
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, type: 'error', message: 'Server error' });
    }
});

module.exports = router;
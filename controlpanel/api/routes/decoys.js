const express = require('express');
const decoysService = require('../services/decoys');
const { authorizationFromPa_id } = require('../middleware/customer-authorization');

const router = express.Router();

/**
 * @swagger
 * /decoys/{pa_id}:
 *   get:
 *     summary: List all decoys for a protected app
 *     tags: [Decoys]
 *     parameters:
 *      - in: path
 *        name: pa_id
 *        required: true
 *        description: The ID of the protected app
 *        schema:
 *          type: string
 *          example: 928b9fa6-a36d-4063-b104-8380d0b08e90
 *     responses:
 *       200:
 *         description: A list of decoys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
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
 *                     $ref: '#/components/schemas/DecoyData'
 *       400:
 *         description: Invalid pa_id supplied
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: error
 *                 code:
 *                   type: integer
 *                   enum: [400]
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid pa_id supplied
 *       404:
 *         description: No decoys found for this app
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   enum: [404]
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: No decoys found for this app
 * 
 * 
 * 
 * 
 */
router.get('/:pa_id', authorizationFromPa_id, async (req, res) => {
    try {
        const result = await decoysService.getDecoysList(req.params.pa_id);
        return res.status(result.code).send(result);
    } catch(e) {
        console.error(e);
        return res.status(500).send({ type: 'error', code: 500, message: 'Server error' });

    }
});

module.exports = router;
const express = require('express');
const decoysService = require('../services/decoys');
const multer = require('multer');
const upload = multer({ dest: 'uploads/decoys/',limits: {fileSize: 1_000_000} });
const { fileLimiter } = require('../util/rate-limiting')
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
/**
 * @swagger
 * /decoys/upload/{pa_id}:
 *   post:
 *     summary: Upload file with decoys for a protected app
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
 *        description: Decoys uploaded successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                code:
 *                  type: integer
 *                  enum: [201]
 *                  example: 201
 *                type:
 *                  type: string
 *                  enum: [success]
 *                  example: success
 *                message:
 *                  type: string
 *                  example: Decoys uploaded successfully
 *       422:
 *        description: Unprocessable entity
 *        content:
 *          application/json:
 *           schema:
 *             oneOf:
 *             - type: object
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
 *                   example: Decoys file is not a valid JSON
 *             - type: object
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
 *                   example: Some decoys were not created due to errors
 *                 data:
 *                   type: string
 *                   example: error_123456789.json
 *             - type: object
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
 *                   example: The decoy was not created due to errors
 *                 data:
 *                  type: string
 *                  example: error_123456789.json
 *       400:
 *        description: Bad request
 *        content:
 *          application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: integer
 *                 enum: [400]
 *                 example: 400
 *               type:
 *                 type: string
 *                 enum: [error]
 *                 example: error
 *               message:
 *                 type: string
 *                 example: Invalid file path
 */
router.post('/upload/:pa_id', upload.single('decoys'), async (req, res) => {
    try {
        const result = await decoysService.uploadDecoys(req.params.pa_id, req.file.path);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});
/**
 * @swagger
 * /decoys/download/{filename}:
 *   post:
 *     summary: Upload file with decoys for a protected app
 *     tags: [Decoys]
 *     parameters:
 *      - in: path
 *        name: filename
 *        required: true
 *        description: Filename of the error file to download
 *        schema:
 *          type: string
 *          example: error_123456789.json
 *     responses:
 *       200:
 *        description: File downloaded successfully
 *        content:
 *          application/octet-stream:
 *            schema:
 *              type: object
 *              format: binary
 *       404:
 *        description: File not found
 *        content:
 *          application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: integer
 *                 enum: [404]
 *                 example: 404
 *               type:
 *                 type: string
 *                 enum: [error]
 *                 example: error
 *               message:
 *                 type: string
 *                 example: File not found
 *       400:
 *        description: Invalid filename
 *        content:
 *          application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: integer
 *                 enum: [400]
 *                 example: 400
 *               type:
 *                 type: string
 *                 enum: [error]
 *                 example: error
 *               message:
 *                 type: string
 *                 example: Invalid filename

 */
router.get('/download-errors/:filename', fileLimiter, async (req, res) => {
    try {
        const result = await decoysService.downloadErrorFile(req.params.filename);
        if (result.type == 'error') return res.status(result.code).send(result);
        res.download(result.data, req.params.filename, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ code: 500, message: "Error downloading file", type: 'error' });
            }
        });
        return;
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});

module.exports = router;
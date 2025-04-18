const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/kubeconfig/',limits: {fileSize: 1_000_000} });

const customerService = require('../services/customer');

const router = express.Router();

router.post('/:id/upload-kubeconfig', upload.single('kubeconfig'), async (req, res) => {
    try {
        const result = await customerService.uploadKubeconfig(req.params.id, req.file.path);
        return res.status(result.code).send(result);
    } catch (e) {
        console.error(e);
        return res.status(500).send({ code: 500, message: "Server error", type: 'error' });
    }
});

module.exports = router;
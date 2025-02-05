const express = require('express');

const userService = require('../services/user');

const router = express.Router();

router.get('/:id', async (req, res) => {
    try {
        const result = await userService.getUserInfo(req.params.id);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.post('/', async (req, res) => {
    try {
        const result = await userService.createUser(req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/:id', async (req, res) => {
    try {
        const result = await userService.updateUser(req.params.id, req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.get('/list', async (req, res) => {
    try {
        return res.send("OK s")
        // const result = await userService.getUserInfo(req.params.id);
        // if (result.type == 'error') {
        //     return res.status(500).send(result.data);
        // }
        // return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/:id/password', async (req, res) => {
    try {
        const result = await userService.changeUserPassword(req.params.id, req.body);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.post('/:id/pic', async (req, res) => {
    try {
        const result = await userService.uploadUserPicture(req.params.id, "PATH");
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await userService.deleteUser(req.params.id);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

router.put('/:id/roles', async (req, res) => {
    try {
        const result = await userService.updateUserRoles(req.params.id, []);
        if (result.type == 'error') {
            return res.status(500).send(result.data);
        }
        return res.status(200).send(result.data);
    } catch(e) {
        console.error(e);
        return res.status(500).send("Server error");
    }
});

module.exports = router
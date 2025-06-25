const ApiKey = require('../models/Api-key');

const authenticate = async (req, res, next) => {
    const key = req.headers['authorization'];
    if (!key) {
        return res.status(401).json({ type: 'error', code: 401, message: "You must use an API key to access this" });
    }
    const apiKey = await ApiKey.findOne({ where: { key }})
    if (!apiKey) {
        return res.status(403).json({ type: 'error', code: 403, message: "Invalid API key" });
    }
    if (!apiKey.permissions.includes('keycloak') && !apiKey.permissions.includes('admin')) {
        return res.status(403).json({ type: 'error', code: 403, message: "You don't have the required permissions to access this" });
    }
    next();
};

module.exports = authenticate;
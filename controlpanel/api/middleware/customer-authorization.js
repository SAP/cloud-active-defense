const Customer = require('../models/Customer');
const ProtectedApp = require('../models/ProtectedApp');
const Decoy = require('../models/Decoy-data');

const authorizationFromPa_id = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ code: 401, type: 'error', message: 'Unauthorized' });

    const customer_id = await extractCustomersFromToken(token);
    if (!customer_id) return res.status(401).json({ code: 401, type: 'error', message: 'Invalid authorization token' });
    
    const pa_id = req.params.pa_id || (req.body ?? req.body.pa_id);
    if (!pa_id) return res.status(400).json({ code: 400, type: 'error', message: 'Protected app ID is missing' });
    
    const protectedApp = await ProtectedApp.findOne({ where: { id: pa_id }, include: [{model: Customer, as: 'customer'}]});
    if (!protectedApp) return res.status(404).json({ code: 404, type: 'error', message: 'Protected app not found' });
    if (!customer_id == protectedApp.customer.id) return res.status(403).json({ code: 403, type: 'error', message: 'Forbidden' });
    next();
}
const authorizationFromCu_id = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ code: 401, type: 'error', message: 'Unauthorized' });

    const customer_id = await extractCustomersFromToken(token);
    if (!customer_id) return res.status(401).json({ code: 401, type: 'error', message: 'Invalid authorization token' });
    req.cu_id = customer_id;
    next();
}
const authorizationFromDecoyId = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ code: 401, type: 'error', message: 'Unauthorized' });

    const customer_id = await extractCustomersFromToken(token);
    if (!customer_id) return res.status(401).json({ code: 401, type: 'error', message: 'Invalid authorization token' });
    
    const decoyId = req.params.id || (req.body ?? req.body.id);
    if (!decoyId) return res.status(400).json({ code: 400, type: 'error', message: 'Decoy ID is missing' });
    
    const decoy = await Decoy.findOne({ where: { id: decoyId }, include: [{ model: ProtectedApp, as: 'protectedApp' }] });
    if (!decoy) return res.status(404).json({ code: 404, type: 'error', message: 'Decoy not found' });
    
    if (!customer_id == decoy.protectedApp.cu_id) return res.status(403).json({ code: 403, type: 'error', message: 'Forbidden' });
    next();
}

const extractCustomersFromToken = async (token) => {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    const data = JSON.parse(payload);

    if (!data || !data.groups) return null;

    const customer = await Customer.findOne({ where: { name: data.groups }, attributes: ['id']});
    return customer.id;
}

module.exports = {
    authorizationFromPa_id,
    authorizationFromCu_id,
    authorizationFromDecoyId
};
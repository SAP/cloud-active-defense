const RateLimit = require('express-rate-limit');

const fileLimiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});

module.exports = {
    fileLimiter,
};
const { isUrl } = require('../util/index')
const checkDeploymentManagerURL = (req, res, next) => {
    if (!process.env.DEPLOYMENT_MANAGER_URL || !isUrl(process.env.DEPLOYMENT_MANAGER_URL)) {
        return res.status(500).json({ type: 'error', code: 500, message: "Deployment manager URL is not configured or badly formatted, you are probably not running Cloud Active Defense in Kyma" });
    }
    next();
}

module.exports = checkDeploymentManagerURL;
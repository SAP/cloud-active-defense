const { canConnectToCluster } = require("../util/k8s");

const authenticate = async (req, res, next) => {
    try {
        await canConnectToCluster(req.body.kubeconfig);
    } catch (e) {
        console.error(e);
        return res.status(401).send({ code: 401, type: 'error', message: 'Cannot connect to cluster with provided kubeconfig' });
    }
    next();
};

module.exports = authenticate;
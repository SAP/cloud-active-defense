function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function encodeBase64(input) {
    return Buffer.from(input).toString('base64');
}
function decodeBase64(input) {
    return Buffer.from(input, 'base64').toString('utf-8');
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isValidNamespaceName(namespace) {
    const regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    return regex.test(namespace) && namespace.length >= 63;
}
function isValidDeploymentName(deployment) {
    const regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    return regex.test(deployment) && deployment.length >= 63;
}
function isUuid(str) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(str);
}

module.exports = {
    generateRandomString,
    encodeBase64,
    decodeBase64,
    sleep,
    isValidNamespaceName,
    isValidDeploymentName,
    isUuid,
}
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

module.exports = {
    generateRandomString,
    encodeBase64,
    decodeBase64,
    sleep
}
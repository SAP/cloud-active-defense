const { isValidRegex } = require(".");
const { isSourceType, isBehaviorType, isDelayType, isDurationType, isValidRespondProperty } = require('./decoy-validator');

function validateConfig(config) {
    if (typeof config != 'object') return ["config must be a json"];
    const errors = [];
    if (config.alert) errors.push(...validateAlert(config.alert));
    if (config.respond.length) {
        for (const respondItem of config.respond) {
            errors.push(...validateRespond(respondItem))
        }
    }
    return errors;
}

function validateAlert(alert) {
    if (typeof alert != 'object') return ["alert must be an object"];
    const errors = [];
    if (alert.session) errors.push(...validateSession(alert.session));
    if (alert.username) errors.push(...validateUsername(alert.username));
    return errors;
}

function validateSession(session) {
    if (typeof session != 'object') return ["session must be an object"];
    const errors = [];
    if (!session.in) errors.push(".in attribute is mandatory for .session");
    if (session.key && isInSession(session.key)) errors.push(".in needs to be cookie or header");
    return errors;
}

function validateUsername(username) {
    if (typeof username != 'object') return [".username must be an object"];
    const errors = [];
    if (username.key && (username.in == 'cookie' || username.in == 'header')) errors.push(".key is mandatory for cookie, or header in .username");
    if (isInUsername(username.in)) errors.push(".in need to be cookie, header or payload for .username");
    if (username.value && username.in == 'payload') errors.push(".value is mandatory for payload for .username");
    if (isValidRegex(username.value)) errors.push(".value needs to be a valid regex");
    return errors;
}

function validateRespond(respond) {
    const errors = [];
    if (!respond) return [];
    if (typeof respond != 'object') return ["respond option must be an object"];
    
    if (!respond.source || !respond.behavior) errors.push("source and behavior cannot be empty");
    if (respond.source && !isSourceType(respond.source)) errors.push("soure needs to be ip, userAgent or session");
    if (respond.behavior && !isBehaviorType(respond.behavior)) errors.push("behavior needs to be drop, error or divert");
    if (respond.delay && !isDelayType(respond.delay)) errors.push("needs a valid delay suffix (s for seconds/m for minutes/h for hours) or now, and must be in a correct format (ex: 10s-20s or 10s)");
    if (respond.duration && !isDurationType(respond.duration)) errors.push("needs a valid delay suffix (s for seconds/m for minutes/h for hours) or forever");
    if (respond.behavior == 'throttle' && (respond.property && !isValidRespondProperty(respond.property))) errors.push("respond.property needs to be a valid int");
    return errors;
}

function isInSession(inType) {
    return inType === 'cookie' || inType === 'header';
}
function isInUsername(inType) {
    return inType === 'cookie' || inType === 'header' || inType === 'payload';
}

module.exports = {
    validateConfig
}
const { isValidRegex } = require('.')

function validateDecoyFilter(decoyFilter) {
    if (typeof decoyFilter != 'object') return ["decoy must be a json"];
    const errors = [];
    errors.push(...validateDecoy(decoyFilter.decoy));
    if(decoyFilter.inject) errors.push(...validateInject(decoyFilter.inject));
    if (decoyFilter.detect) errors.push(...validateDetect(decoyFilter.detect));
    return errors;
}
function validateDecoy(decoy) {
    const errors = [];
    if (!decoy) return [".decoy attribute is mandatory"];
    if (typeof decoy != 'object') return [".decoy must be an object"];
    if (!decoy.key && !decoy.dynamicKey && !decoy.string) errors.push("key, dynamicKey and string cannot all be empty");
    if (!isValidRegex(decoy.dynamicKey)) errors.push("dynamicKey needs to be a valid regex");
    if (!isValidRegex(decoy.dynamicValue)) errors.push("dynamicValue needs to be a valid regex");
    return errors;
}
function validateInject(inject) {
    const errors = [];
    if (!inject) return [".inject attribute is mandatory"];
    if (typeof inject != 'object') return [".inject must be an object"];
    errors.push(...validateStore(inject.store));
    if (inject.whenTrue) {
        for (const when of inject.whenTrue) {
            errors.push(...validateWhenType(when));
        }
    }
    if (inject.whenFalse) {
        for (const when of inject.whenFalse) {
            errors.push(...validateWhenType(when));
        }
    }
    return errors;
}
function validateStore(store) {
    const errors = [];
    if (!store) return [".store attribute is mandatory for .inject"];
    if (typeof store != 'object') return [".store must be an object"];
    
    if (store.inRequest && !isValidRegex(store.inRequest)) errors.push("inRequest needs to be a valid regex");
    if (store.inResponse && !isValidRegex(store.inResponse)) errors.push("inResponse needs to be a valid regex");
    if (store.withVerb && !isVerbType(store.withVerb)) errors.push("withVerb needs to be a valid HTTP verb or empty");
    if (!isAsType(store.as)) errors.push("as needs to be cookie , header or body");
    if (store.at) {
        if (typeof store.at != 'object') errors.push(".store.at must be an object");
        else {
            if (store.at.method && !isAtMethodType(store.at.method)) errors.push("at.method need to be a valid injection method or empty");
            if (store.at.property && !isValidAtProperty(store.at.property, store.at.method)) errors.push("at.property needs to match injection method: numbers for line and character, regex for rest");
        }
    }
    return errors;
}
function validateWhenType(when) {
    const errors = [];
    if (!when) return [];
    if (typeof when != 'object') return ["condition in whenTrue/False must be an object"];
    if (!when.key && (when.in == 'header' || when.in == 'cookie' || when.in == 'getParam' || when.in == 'postParam')) errors.push("key is required and cannot be empty for header, cookie, getParam and postParam");
    if (!when.value) errors.push("value is required and cannot be empty");
    if (!when.in) errors.push("in is required and cannot be empty");
    if (when.in && !isInType(when.in)) errors.push("in needs to be cookie, header, url, getParam, postParam or payload");
    return errors;
}
function validateDetect(detect) {
    const errors = [];
    if (!detect) return [".detect attibute is mandatory"];
    if (typeof detect != 'object') return [".detect must be an object"];
    
    errors.push(...validateSeek(detect.seek));
    if (detect.alert) errors.push(...validateAlert(detect.alert))
    if (detect.respond?.length) {
        for (const respondItem of detect.respond) {
            errors.push(...validateRespond(respondItem));
        }
    }
    return errors;
}
function validateSeek(seek) {
    const errors = [];
    if (!seek) return [".seek attribute is mandatory for detect"];
    if (typeof seek != 'object') return [".seek must be an object"];

    if (seek.inRequest && !isValidRegex(seek.inRequest)) errors.push("inRequest needs to be a valid regex");
    if (seek.inResponse && !isValidRegex(seek.inResponse)) errors.push("inResponse needs to be a valid regex");
    if (seek.withVerb && !isVerbType(seek.withVerb)) errors.push("withVerb need to be a valid HTTP verb or empty");
    if (seek.in && !isInType(seek.in)) errors.push("in needs to be cookie, header, url, getParam, postParam, payload");
    return errors;
}
function validateAlert(alert) {
    if (!isSeverityType(alert.severity)) return ["severity needs to be HIGH, MEDIUM or LOW"];
    return [];
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

function isVerbType(verb) {
    return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(verb);
}
function isAsType(as) {
    return ['header', 'body', 'cookie'].includes(as);
}
function isAtMethodType(method) {
    return ['character', 'line', 'replace', 'always','after', 'before'].includes(method);
}
function isValidAtProperty(property, method) {
  if (!method) return true;
  if (!property) return false;
  if (method == 'character' || method == 'line') {
      if (isNaN(parseFloat(property))) return false
  }
  else if (method == 'replace' || method == 'always' || method == 'after' || method == 'before'){
      if (!isValidRegex(property)) return false
  }
  return true;
}
function isInType(inType) {
    return ['cookie', 'header', 'url', 'getParam', 'postParam', 'payload'].includes(inType);
}
function isSeverityType(severity) {
    return ['LOW', 'MEDIUM', 'HIGH'].includes(severity);
}
function isSourceType(source) {
    return ['ip', 'userAgent', 'session'].some(s => source.split(',').includes(s));
}
function isBehaviorType(behavior) {
    return ['divert', 'error', 'drop', 'throttle'].includes(behavior);
}
function isDelayType(delay) {
    if (delay === 'now') return true;
    const regex = /^\d+[smh]$/;
    return regex.test(delay);
}
function isDurationType(duration) {
  if (duration === 'forever') return true;
  const regex = /^\d+[smh]$/;
  return regex.test(duration);
}
function isValidRespondProperty(property) {
  const splitProperty = property.split('-')
  if (splitProperty.length == 2) {
    const min = parseFloat(splitProperty[0])
    if (isNaN(min)) return false;
    const max = parseFloat(splitProperty[1])
    if (isNaN(max)) return false;
    if (max <= min) return false;
    return true;
  }
  else {
    if (isNaN(parseFloat(property))) return false
    return true;
  }
}

module.exports = {
    validateDecoyFilter,
    validateDecoy,
    validateStore,
    validateDetect,
    validateSeek,
    validateAlert,
    validateWhenType,
    isSourceType,
    isBehaviorType,
    isDelayType,
    isDurationType,
    isValidRespondProperty
}
import { isValidRegex } from ".";
import { AlertType, Decoy, DecoyType, DetectType, isAsType, isAtMethodType, isBehaviorType, isDelayType, isDurationType, isInType, isSeverityType, isSourceType, isValidAtProperty, isValidRespondProperty, isVerbType, RespondType, SeekType, StoreType, WhenType } from "../models/decoy";

export function validateFilters(filters: Decoy[]): string[] {
    const errors: string[] = [];
    for (const filter of filters) {
        errors.push(...validateDecoyFilter(filter));
    }
    return errors;
}
export function validateDecoyFilter(decoyFilter: Decoy): string[] {
    const errors: string[] = [];
    errors.push(...validateDecoy(decoyFilter.decoy));
    if(decoyFilter.inject) errors.push(...validateStore(decoyFilter.inject.store));
    if (decoyFilter.detect) errors.push(...validateDetect(decoyFilter.detect));
    return errors;
}
export function validateDecoy(decoy: DecoyType): string[] {
    const errors: string[] = [];
    if (!decoy.key && !decoy.dynamicKey && !decoy.string) errors.push("key, dynamicKey and string cannot all be empty");
    if (!isValidRegex(decoy.dynamicKey)) errors.push("dynamicKey needs to be a valid regex");
    if (!isValidRegex(decoy.dynamicValue)) errors.push("dynamicValue needs to be a valid regex");
    return errors;
}
export function validateStore(store: StoreType): string[] {
    const errors: string[] = [];
    if (!store) return [];
    if (store.inRequest && !isValidRegex(store.inRequest)) errors.push("inRequest needs to be a valid regex");
    if (store.inResponse && !isValidRegex(store.inResponse)) errors.push("inResponse needs to be a valid regex");
    if (store.withVerb && !isVerbType(store.withVerb)) errors.push("withVerb needs to be a valid HTTP verb or empty");
    if (!isAsType(store.as)) errors.push("as needs to be cookie , header or body");
    if (store.at) {
        if (store.at.method && !isAtMethodType(store.at.method)) errors.push("at.method need to be a valid injection method or empty");
        if (store.at.property && !isValidAtProperty(store.at.property, store.at.method)) errors.push("at.property needs to match injection method: numbers for line and character, regex for rest");
    }
    return errors;
}
export function validateWhenType(when: WhenType): string[] {
    const errors: string[] = [];
    if (!when.key && (when.in == 'header' || when.in == 'cookie' || when.in == 'getParam' || when.in == 'postParam')) errors.push("key is required and cannot be empty for header, cookie, getParam and postParam");
    if (!when.value) errors.push("value is required and cannot be empty");
    if (!when.in) errors.push("in is required and cannot be empty");
    if (when.in && !isInType(when.in)) errors.push("in needs to be cookie, header, url, getParam, postParam or payload");
    return errors;
}
export function validateDetect(detect: DetectType): string[] {
    const errors: string[] = [];
    errors.push(...validateSeek(detect.seek))
    if (detect.alert) errors.push(...validateAlert(detect.alert))
    if (detect.respond?.length) {
        for (const respondItem of detect.respond) {
            errors.push(...validateRespond(respondItem));
        }
    }
    return errors;
}
export function validateSeek(seek: SeekType): string[] {
    const errors: string[] = [];
    if (seek.inRequest && !isValidRegex(seek.inRequest)) errors.push("inRequest needs to be a valid regex");
    if (seek.inResponse && !isValidRegex(seek.inResponse)) errors.push("inResponse needs to be a valid regex");
    if (seek.withVerb && !isVerbType(seek.withVerb)) errors.push("withVerb need to be a valid HTTP verb or empty");
    if (seek.in && !isInType(seek.in)) errors.push("in needs to be cookie, header, url, getParam, postParam, payload");
    return errors;
}
export function validateAlert(alert: AlertType): string[] {
    if (isSeverityType(alert.severity)) return ["severity needs to be HIGH, MEDIUM or LOW"];
    return [];
}
export function validateRespond(respond: RespondType): string[] {
    const errors: string[] = [];
    if (!respond.source || !respond.behavior) errors.push("source and behavior cannot be empty");
    if (respond.source && !isSourceType(respond.source)) errors.push("soure needs to be ip, userAgent or session");
    if (respond.behavior && !isBehaviorType(respond.behavior)) errors.push("behavior needs to be drop, error or divert");
    if (respond.delay && !isDelayType(respond.delay)) errors.push("needs a valid delay suffix (s for seconds/m for minutes/h for hours) or now, and must be in a correct format (ex: 10s-20s or 10s)");
    if (respond.duration && isDurationType(respond.duration)) errors.push("needs a valid delay suffix (s for seconds/m for minutes/h for hours) or forever");
    if (respond.behavior == 'throttle' && (respond.property && !isValidRespondProperty(respond.property))) errors.push("respond.property needs to be a valid int");
    return errors;
}
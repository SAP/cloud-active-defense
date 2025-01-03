import { isValidRegex } from "../utils";

export interface Decoy {
    decoy: DecoyType
    inject?: InjectType
    detect?: DetectType
}

export type DecoyType = {
  key?: string,
  dynamicKey?: string,
  separator?: string,
  value?: string,
  dynamicValue?: string,
  string?: string
}
export type InjectType = {
  store: StoreType,
  whenTrue?: WhenType[],
  whenFalse?: WhenType[]
}
export type StoreType = {
  inRequest?: string,
  inResponse?: string,
  withVerb?: VerbType,
  as: AsType,
  at?: {
      method: AtMethodType,
      property: string
  },
}
export type WhenType = {
    key: string,
    value?: string,
    in: InType
}
export type DetectType = {
  seek: SeekType
  alert?: AlertType
  respond?: RespondType[]
}
export type SeekType = {
  inRequest?: string,
  inResponse?: string,
  withVerb?: VerbType,
  in: InType
}
export type AlertType = {
  severity: SeverityType,
  whenSeen?: boolean,
  whenComplete?: boolean,
  whenModified?: boolean,
  whenAbsent?: boolean
}
export type RespondType = {
  source: string,
  behavior: BehaviorType,
  delay?: DelayType,
  duration?: DurationType,
  property?: string
}
export type AtMethodType = 'character' | 'line' | 'replace' | 'always' | 'after' | 'before';
export type AsType = 'header' | 'body' | 'cookie';
export type RequestType = 'inRequest' | 'inResponse';
export type VerbType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type InType = 'cookie' | 'header' | 'url' | 'getParam' | 'postParam' | 'payload';
export type SeverityType = 'LOW' | 'MEDIUM' | 'HIGH';
export type BehaviorType = 'divert' | 'error' | 'drop' | 'throttle';
export type DelayType = 'now' | `${number}${'s' | 'm' | 'h'}`;
export type DurationType = 'forever' | `${number}${'s' | 'm' | 'h'}`;

export const isAsType = (x: any): x is AsType => ['header', 'body', 'cookie'].includes(x);
export const isRequestType = (x: any): x is RequestType => ['inRequest', 'inResponse'].includes(x);
export const isVerbType = (x:any): x is VerbType => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(x);
export const isAtMethodType = (x:any): x is AtMethodType => ['character', 'line', 'replace', 'always','after', 'before'].includes(x);
export const isValidAtProperty = (property: string, method: AtMethodType) => {
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
export const isInType = (x: any): x is InType => ['cookie', 'header', 'url', 'getParam', 'postParam', 'payload'].includes(x);
export const isSeverityType = (x: any): x is SeverityType => ['LOW', 'MEDIUM', 'HIGH'].includes(x);
export const isSourceType = (x: string) => ['ip', 'userAgent', 'session'].some(source => x.split(',').includes(source));
export const isBehaviorType = (x: any): x is BehaviorType => ['divert', 'error', 'drop', 'throttle'].includes(x);
export const isDelayType = (x: any): x is DelayType => {
  if (x === 'now') return true;
  const regex = /^\d+[smh]$/;
  return regex.test(x);
}
export const isDurationType = (x: any): x is DurationType => {
  if (x === 'forever') return true;
  const regex = /^\d+[smh]$/;
  return regex.test(x);
}
export const isValidRespondProperty = (property: string) => {
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

export interface Decoy {
    decoy: {
        key?: string,
        dynamicKey?: string,
        separator?: string,
        value?: string,
        dynamicValue?: string,
        string?: string
    },
    inject?: {
        store: {
            inRequest?: string,
            inResponse?: string,
            withVerb?: string,
            as: AsType,
            at?: {
                method: AtMethodType,
                property: string
            },
            whenTrue?: WhenType[],
            whenFalse?: WhenType[]
        }
    },
    detect?: {
      seek: {
        inRequest?: string,
        inResponse?: string,
        withVerb?: string,
        in: InType
      },
      alert?: {
        severity: SeverityType,
        whenSeen?: boolean,
        whenComplete?: boolean,
        whenModified?: boolean,
        whenAbsent?: boolean
      },
      respond?: RespondType[]
    }
}

export type WhenType = {
    key: string,
    value?: string,
    in: 'cookie' | 'header' | 'url' | 'getParam' | 'postParam' | 'payload'
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
export const isInType = (x: any): x is InType => ['cookie', 'header', 'url', 'getParam', 'postParam', 'payload'].includes(x);
export const isSeverityType = (x: any): x is SeverityType => ['LOW', 'MEDIUM', 'HIGH'].includes(x);
export const isBehaviorType = (x: any): x is BehaviorType => ['divert', 'error', 'drop', 'throttle'].includes(x);

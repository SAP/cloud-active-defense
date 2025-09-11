import { RespondType } from "./decoy"

export interface Config {
    alert?: AlertType,
    server?: string,
    respond?: RespondType[],
    blocklistReload?: number,
    configReload?: number
}

export type AlertType = {
    session?: SessionType,
    username?: UsernameType
}

export type SessionType = {
    in: InSessionType,
    key: string
}

export type UsernameType = {
    in: InUsernameType,
    key?: string,
    value: string
}

export type InSessionType = 'cookie' | 'header';
export type InUsernameType = 'cookie' | 'header' | 'payload';

export const isInSession = (x:any): x is InSessionType => ['cookie', 'header'].includes(x);
export const isInUsername = (x:any): x is InUsernameType => ['cookie', 'header', 'payload'].includes(x);
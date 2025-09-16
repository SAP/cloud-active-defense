import { UUID } from "./types";

export interface ProtectedApp {
    id: UUID,
    namespace: string,
    application: string,
    lastConfigTime: number | null,
    lightColor: string
}

export const isProtectedAppEmpty = (p: ProtectedApp) => p.id === '' && p.application === '' && p.namespace === '' && p.lastConfigTime === null && p.lightColor == '';
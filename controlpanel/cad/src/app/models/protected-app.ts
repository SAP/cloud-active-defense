import { UUID } from "./types";

export interface ProtectedApp {
    id: UUID,
    namespace: string,
    application: string,
    lastConfigTime: number | null,
}

export const isProtectedAppEmpty = (p: ProtectedApp) => p.id === '' && p.application === '' && p.namespace === '' && p.lastConfigTime === null;
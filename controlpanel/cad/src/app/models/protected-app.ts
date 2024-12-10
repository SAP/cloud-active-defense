import { UUID } from "./types";

export interface ProtectedApp {
    id: UUID,
    namespace: string,
    application: string,
}

export const isProtectedAppEmpty = (p: ProtectedApp) => p.id === '' && p.application === '' && p.namespace === '';
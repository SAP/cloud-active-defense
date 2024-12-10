import { Decoy } from "./decoy";
import { UUID } from "./types";

export interface DecoyData {
    id?: UUID,
    state: DecoyState,
    pa_id: UUID,
    decoy: Decoy,
}

export type DecoyState = 'active' | 'inactive' | 'error';
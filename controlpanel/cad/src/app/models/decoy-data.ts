import { Decoy } from "./decoy";
import { UUID } from "./types";

export interface DecoyData {
    id?: UUID,
    pa_id: UUID,
    deployed: boolean,
    decoy: Decoy,
}
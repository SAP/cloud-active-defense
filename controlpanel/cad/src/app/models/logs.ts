import { UUID } from "./types";

export interface Logs {
    id: UUID,
    date: number,
    // pa_id: UUID,
    type: string,
    content: string
}
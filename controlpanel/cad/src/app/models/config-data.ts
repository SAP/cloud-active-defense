import { Config } from "./config";
import { UUID } from "./types";

export interface ConfigData {
    id?: UUID,
    pa_id: UUID
    config: Config
}
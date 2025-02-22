import { PCChunk } from "prismarine-chunk";

export interface NearbySurroundingsConfig {
  blockRadius: number;
}

export type PCChunkCoordinateAndColumn = { chunkX: number; chunkZ: number; column: PCChunk };

export interface ImmediateSurroundingsConfig {
  radius: number;
}

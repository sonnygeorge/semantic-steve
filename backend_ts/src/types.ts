import { PCChunk } from "prismarine-chunk";


export type SurroundingsOptions = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

export type PCChunkCoordinateAndColumn = { chunkX: number; chunkZ: number; column: PCChunk };

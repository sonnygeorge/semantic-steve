import { PCChunk } from "prismarine-chunk";
import { EquipmentDestination } from "mineflayer";
import {Item as PItem} from 'prismarine-item'

export type SemanticSteveFunctionReturnObj = { resultString: string | null; envStateIsUpToDate: boolean; }
export type SemanticSteveFunction = (...args: any[]) => Promise<SemanticSteveFunctionReturnObj>;

export type SurroundingsOptions = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

export type EquipmentAndDestination = {
  hand: PItem
  head: PItem
  torso: PItem
  legs: PItem
  feet: PItem
  "off-hand": PItem
}

export type PCChunkCoordinateAndColumn = { chunkX: number; chunkZ: number; column: PCChunk };

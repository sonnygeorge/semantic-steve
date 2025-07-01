import { Entity as PEntity } from "prismarine-entity";
import type { Item as PItem } from "prismarine-item";

export interface SemanticSteveConfigOptions {
  selfPreservationCheckThrottleMS?: number;
  immediateSurroundingsRadius?: number;
  distantSurroundingsRadius?: number;
  botHost?: string;
  botPort?: number;
  mfViewerPort?: number;
  zmqPort?: number;
  username?: string;
}

export class SemanticSteveConfig {
  selfPreservationCheckThrottleMS: number;
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
  botHost: string;
  botPort: number;
  mfViewerPort: number;
  zmqPort: number;
  username: string;

  constructor(options: SemanticSteveConfigOptions = {}) {
    this.selfPreservationCheckThrottleMS =
      options.selfPreservationCheckThrottleMS ?? 1500;
    this.immediateSurroundingsRadius = options.immediateSurroundingsRadius ?? 5;
    this.distantSurroundingsRadius = options.distantSurroundingsRadius ?? 13;
    this.botHost = options.botHost ?? "localhost";
    this.botPort = options.botPort ?? 25565;
    this.mfViewerPort = options.mfViewerPort ?? 3000;
    this.zmqPort = options.zmqPort ?? 5555;
    this.username = options.username ?? "SemanticSteve";
  }
}

export interface SkillResult {
  message: string;
}

// Six sides of a cubed meter in minecraft
export enum ConnectingSide {
  WEST = "west",
  EAST = "east",
  BOTTOM = "bottom",
  TOP = "top",
  NORTH = "north",
  SOUTH = "south",
}

export class InvalidThingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidThingTypeError";
  }
}

/**
 * "Data Transfer Object" (DTO) version of `InventoryChanges` containing the
 * information that we want to send to the Python client in the format we want the user
 * (LLM) to see it.
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export interface InventoryChangesDTO {
  itemsAcquired: { [key: string]: number };
  itemsLostOrConsumed: { [key: string]: number };
}

export type MaybePromise<T, E = undefined> = Promise<T | E> | T | E;

export interface ItemEntityWithData {
  entity: PEntity;
  itemData: PItem;
}

export type AbsoluteWorldVoxelString = string; // e.g., "321,-42,523" for voxel at (321, -42, 523)
export type RelativeVoxelOffsetString = string; // e.g., "1,0,0" for offset voxel at (1, 0, 0)

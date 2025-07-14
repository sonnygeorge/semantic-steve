import { Entity as PEntity } from "prismarine-entity";
import type { Item as PItem } from "prismarine-item";

export type MaybePromise<T, E = undefined> = Promise<T | E> | T | E;

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

// Useful for connecting an item entity with its PItem data
export interface ItemEntityWithData {
  entity: PEntity;
  itemData: PItem;
}

// BlockFace as used in prismarine-world... TODO: Can we not import this somehow?
export const BlockFace = {
  UNKNOWN: -999,
  BOTTOM: 0,
  TOP: 1,
  NORTH: 2,
  SOUTH: 3,
  WEST: 4,
  EAST: 5,
};

// prismarine-world's Blockface, but as an enum
export enum VoxelFace {
  UNKNOWN = BlockFace.UNKNOWN,
  BOTTOM = BlockFace.BOTTOM,
  TOP = BlockFace.TOP,
  NORTH = BlockFace.NORTH,
  SOUTH = BlockFace.SOUTH,
  WEST = BlockFace.WEST,
  EAST = BlockFace.EAST,
}

// Type aliases so certain types can express their intent more clearly
export type SerializedVec3 = string;
export type SerializedWorldVoxel = SerializedVec3; // Format: `${serializeVec3(worldVoxel)}`
export type SerializedVoxelOffset = SerializedVec3; // Format: `${serializeVec3(voxelOffset)`
export type SerializedVoxelOffsetFace = string; // Format: `${serializeVec3(voxelOffset)},${VoxelFace}`
export type SerializedOrientation = string; //Format: `${ThreeDimOrientation().serialize()}`

/**
 * The radii that parameterize the geometry of the `Vicinity`s of the bot's surroundings.
 */
export type SurroundingsRadii = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

/**
 * Keys identifying the 10 "directions" that slice the *distant* surroundings.
 *
 * A subset of the 11 "vicinities" in the bot's surroundings (which additionally includes
 * the immediate surroundings vicinity).
 */
export enum DirectionName {
  UP = "up",
  DOWN = "down",
  NORTH = "north",
  NORTHEAST = "northeast",
  EAST = "east",
  SOUTHEAST = "southeast",
  SOUTH = "south",
  SOUTHWEST = "southwest",
  WEST = "west",
  NORTHWEST = "northwest",
}

/**
 * Keys used to identify the 11 regions of space around the bot.
 */
export enum VicinityName {
  IMMEDIATE_SURROUNDINGS = "immediate",
  DISTANT_SURROUNDINGS_UP = DirectionName.UP,
  DISTANT_SURROUNDINGS_DOWN = DirectionName.DOWN,
  DISTANT_SURROUNDINGS_NORTH = DirectionName.NORTH,
  DISTANT_SURROUNDINGS_NORTHEAST = DirectionName.NORTHEAST,
  DISTANT_SURROUNDINGS_EAST = DirectionName.EAST,
  DISTANT_SURROUNDINGS_SOUTHEAST = DirectionName.SOUTHEAST,
  DISTANT_SURROUNDINGS_SOUTH = DirectionName.SOUTH,
  DISTANT_SURROUNDINGS_SOUTHWEST = DirectionName.SOUTHWEST,
  DISTANT_SURROUNDINGS_WEST = DirectionName.WEST,
  DISTANT_SURROUNDINGS_NORTHWEST = DirectionName.NORTHWEST,
}

import { PCChunk } from "prismarine-chunk";
import { Bot, EquipmentDestination } from "mineflayer";
import { Item as PItem } from "prismarine-item";

export type SkillReturnObj = {
  resultString: string | null;
  envStateIsUpToDate: boolean;
};
export type Skill = (
  ...args: any[]
) => SkillReturnObj | Promise<SkillReturnObj>;
export type FunctionRegistry = Record<string, Skill>;

export type PropertiesOnly<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

export type SurroundingsOptions = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

export type EquipmentAndDestination = {
  hand: PItem;
  head: PItem;
  torso: PItem;
  legs: PItem;
  feet: PItem;
  "off-hand": PItem;
};

export enum Direction {
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

export enum Vicinity {
  IMMEDIATE = "immediate",
  UP = Direction.UP,
  DOWN = Direction.DOWN,
  NORTH = Direction.NORTH,
  NORTHEAST = Direction.NORTHEAST,
  EAST = Direction.EAST,
  SOUTHEAST = Direction.SOUTHEAST,
  SOUTH = Direction.SOUTH,
  SOUTHWEST = Direction.SOUTHWEST,
  WEST = Direction.WEST,
  NORTHWEST = Direction.NORTHWEST,
}

export type PCChunkCoordinateAndColumn = {
  chunkX: number;
  chunkZ: number;
  column: PCChunk;
};

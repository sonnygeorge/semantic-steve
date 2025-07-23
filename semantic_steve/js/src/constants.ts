import { Vec3 } from "vec3";
import { VoxelFace } from "./types";

// PEntity types that fall under the umbrella of "mob"
export const MOB_ENTITY_TYPES = ["animal", "hostile", "mob", "passive"];

// Max time to allow a single pathfinding run to take
export const MAX_ALLOWED_PATHFINDING_TIME_MS = 27000; // 27 seconds

// Amount of wait that should lead to an item entity pickup if the bot is in range for pickup
export const ITEM_PICKUP_WAIT_MS = 400;

// Amount of wait time for things to settle, e.g., gravel to fall, after block placement
export const BLOCK_PLACEMENT_WAIT_MS = 200;

// Amount of wait time for a block drop to settle after mining
export const BLOCK_DROP_WAIT_MS = 400;

// Amount of wait time to ensure crafted items register in the bot's inventory after crafting
export const CRAFTING_WAIT_MS = 100;

// Amount of wait time to ensure a minecraft command is fulfilled
export const MC_COMMAND_WAIT_MS = 350;

// Amount of wait time for f2 to take a screenshot
export const SCREENSHOT_WAIT_MS = 300;

// Slightly lowered (normal is 4.5) distance from the bot at which a block can be placed
export const MAX_PLACEMENT_REACH = 4;

// The maximum distance from the bot at which a block can be reached for mining
export const MAX_MINING_REACH = 4.5;

// Six sides of a voxel (block space) in minecraft
export const ADJACENT_OFFSETS: Map<VoxelFace, Vec3> = new Map([
  [VoxelFace.WEST, new Vec3(-1, 0, 0)],
  [VoxelFace.EAST, new Vec3(1, 0, 0)],
  [VoxelFace.BOTTOM, new Vec3(0, -1, 0)],
  [VoxelFace.TOP, new Vec3(0, 1, 0)],
  [VoxelFace.NORTH, new Vec3(0, 0, -1)],
  [VoxelFace.SOUTH, new Vec3(0, 0, 1)],
]);

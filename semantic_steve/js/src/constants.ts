import { Vec3 } from "vec3";
import { ConnectingSide } from "./types";

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

// Bot eye height in meters
export const BOT_EYE_HEIGHT = 1.62;

// Six sides of a cubed meter (block space) in minecraft
export const ADJACENT_OFFSETS = {
  [ConnectingSide.WEST]: new Vec3(-1, 0, 0),
  [ConnectingSide.EAST]: new Vec3(1, 0, 0),
  [ConnectingSide.BOTTOM]: new Vec3(0, -1, 0),
  [ConnectingSide.TOP]: new Vec3(0, 1, 0),
  [ConnectingSide.NORTH]: new Vec3(0, 0, -1),
  [ConnectingSide.SOUTH]: new Vec3(0, 0, 1),
};

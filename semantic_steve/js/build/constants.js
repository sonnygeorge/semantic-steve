"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADJACENT_OFFSETS = exports.BOT_EYE_HEIGHT = exports.MAX_MINING_REACH = exports.MAX_PLACEMENT_REACH = exports.CRAFTING_WAIT_MS = exports.BLOCK_DROP_WAIT_MS = exports.BLOCK_PLACEMENT_WAIT_MS = exports.ITEM_PICKUP_WAIT_MS = void 0;
const vec3_1 = require("vec3");
const types_1 = require("./types");
// Amount of wait that should lead to an item entity pickup if the bot is in range for pickup
exports.ITEM_PICKUP_WAIT_MS = 400;
// Amount of wait time for things to settle, e.g., gravel to fall, after block placement
exports.BLOCK_PLACEMENT_WAIT_MS = 200;
// Amount of wait time for a block drop to settle after mining
exports.BLOCK_DROP_WAIT_MS = 400;
// Amount of wait time to ensure crafted items register in the bot's inventory after crafting
exports.CRAFTING_WAIT_MS = 100;
// Slightly lowered (normal is 4.5) distance from the bot at which a block can be placed
exports.MAX_PLACEMENT_REACH = 4;
// The maximum distance from the bot at which a block can be reached for mining
exports.MAX_MINING_REACH = 4.5;
// Bot eye height in meters
exports.BOT_EYE_HEIGHT = 1.62;
// Six sides of a cubed meter in minecraft
exports.ADJACENT_OFFSETS = {
    [types_1.ConnectingSide.WEST]: new vec3_1.Vec3(-1, 0, 0),
    [types_1.ConnectingSide.EAST]: new vec3_1.Vec3(1, 0, 0),
    [types_1.ConnectingSide.BOTTOM]: new vec3_1.Vec3(0, -1, 0),
    [types_1.ConnectingSide.TOP]: new vec3_1.Vec3(0, 1, 0),
    [types_1.ConnectingSide.NORTH]: new vec3_1.Vec3(0, 0, -1),
    [types_1.ConnectingSide.SOUTH]: new vec3_1.Vec3(0, 0, 1),
};

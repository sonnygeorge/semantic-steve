"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlocksCache = exports.ItemEntitiesCache = void 0;
const vec3_1 = require("vec3");
/**
 * Cache for item entities indexed by their UUIDs.
 */
class ItemEntitiesCache extends Map {
    constructor(bot) {
        super();
        this.bot = bot;
    }
}
exports.ItemEntitiesCache = ItemEntitiesCache;
/**
 * Cache for blocks indexed by stringified Vec3 positions.
 */
class BlocksCache extends Map {
    constructor(bot) {
        super();
        this.bot = bot;
    }
    static getKeyFromVec3(pos) {
        return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
    }
    static getVec3FromKey(key) {
        const parts = key.split(",");
        const x = Number(parts[0]);
        const y = Number(parts[1]);
        const z = Number(parts[2]);
        return new vec3_1.Vec3(x, y, z);
    }
}
exports.BlocksCache = BlocksCache;

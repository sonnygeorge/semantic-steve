"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllLoadedBlocksCache = exports.AllSpawnedItemEntitiesCache = void 0;
const vec3_1 = require("vec3");
/**
 * Cache for all spawned item entities indexed by their UUIDs.
 */
class AllSpawnedItemEntitiesCache extends Map {
    constructor(bot) {
        super();
        this.bot = bot;
    }
}
exports.AllSpawnedItemEntitiesCache = AllSpawnedItemEntitiesCache;
/**
 * Cache for all loaded blocks indexed by stringified Vec3 positions.
 */
class AllLoadedBlocksCache extends Map {
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
exports.AllLoadedBlocksCache = AllLoadedBlocksCache;

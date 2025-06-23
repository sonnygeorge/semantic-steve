"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFuncToCoordsInChunk = applyFuncToCoordsInChunk;
exports.isChunkAtLeastPartiallyWithinRadius = isChunkAtLeastPartiallyWithinRadius;
const vec3_1 = require("vec3");
/**
 * Applies a function to all coordinates in a chunk.
 */
function applyFuncToCoordsInChunk(bot, fn, chunkPoint) {
    var _a, _b;
    const chunkX = chunkPoint.x >> 4;
    const chunkZ = chunkPoint.z >> 4;
    const minY = (_a = bot.game.minY) !== null && _a !== void 0 ? _a : 0;
    const maxY = (_b = bot.game.height) !== null && _b !== void 0 ? _b : 256;
    for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
            const worldX = (chunkX << 4) + x;
            const worldZ = (chunkZ << 4) + z;
            for (let y = minY; y < maxY; y++) {
                const pos = new vec3_1.Vec3(worldX, y, worldZ);
                fn(pos);
            }
        }
    }
}
function isChunkAtLeastPartiallyWithinRadius(bot, chunkPoint, radius) {
    const closestX = Math.max(chunkPoint.x, Math.min(bot.entity.position.x, chunkPoint.x + 15));
    const closestZ = Math.max(chunkPoint.z, Math.min(bot.entity.position.z, chunkPoint.z + 15));
    const horizontalDistance = Math.sqrt(Math.pow(closestX - bot.entity.position.x, 2) +
        Math.pow(closestZ - bot.entity.position.z, 2));
    return horizontalDistance <= radius;
}

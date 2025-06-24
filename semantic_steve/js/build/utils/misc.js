"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentDimensionYLimits = getCurrentDimensionYLimits;
exports.getAllCoordsWithinRadiusToPos = getAllCoordsWithinRadiusToPos;
const vec3_1 = require("vec3");
function getCurrentDimensionYLimits(bot) {
    if (bot.version < "1.18")
        return { minY: 0, maxY: 255 };
    const limits = {
        overworld: { minY: -64, maxY: 319 },
        the_nether: { minY: 0, maxY: 127 },
        the_end: { minY: 0, maxY: 255 },
    };
    return limits[bot.game.dimension] || limits.overworld;
}
function* getAllCoordsWithinRadiusToPos(pos, radius, bot) {
    const { minY: dimensionBottom, maxY: dimensionTop } = getCurrentDimensionYLimits(bot);
    pos = pos.floored();
    const radiusSquared = radius * radius;
    // Iterate through a square and filter by circular bounds
    for (let x = -radius; x <= radius; x++) {
        const xSquared = x * x;
        // Calculate max z for this x to stay within circle
        const maxZ = Math.floor(Math.sqrt(radiusSquared - xSquared));
        for (let z = -maxZ; z <= maxZ; z++) {
            const zSquared = z * z;
            // Calculate Y bounds based on remaining radius
            const remainingRadiusSquared = radiusSquared - xSquared - zSquared;
            const maxYOffset = Math.floor(Math.sqrt(remainingRadiusSquared));
            // Clip to dimension limits
            const minY = Math.max(dimensionBottom, pos.y - maxYOffset);
            const maxY = Math.min(dimensionTop, pos.y + maxYOffset);
            for (let y = minY; y <= maxY; y++) {
                yield new vec3_1.Vec3(pos.x + x, y, pos.z + z);
            }
        }
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_EYE_HEIGHT = void 0;
exports.getDurability = getDurability;
exports.isBlockVisible = isBlockVisible;
const vec3_1 = require("vec3");
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
function getDurability(bot, item) {
    // For newer Mineflayer versions that use the `durabilityUsed` property
    if (item.durabilityUsed) {
        return item.durabilityUsed;
    }
    // For older Mineflayer versions that use metadata directly
    if (bot.registry.supportFeature("nbtOnMetadata")) {
        if (item.metadata !== undefined) {
            return item.metadata;
        }
    }
}
exports.BOT_EYE_HEIGHT = 1.62;
function isBlockVisible(bot, block, blockCoords) {
    var _a;
    // Check if block has exposed sides
    const offsets = [
        new vec3_1.Vec3(1, 0, 0),
        new vec3_1.Vec3(-1, 0, 0),
        new vec3_1.Vec3(0, 1, 0),
        new vec3_1.Vec3(0, -1, 0),
        new vec3_1.Vec3(0, 0, 1),
        new vec3_1.Vec3(0, 0, -1),
    ];
    // Check if at least one side is exposed
    let isExposed = false;
    for (const offset of offsets) {
        const blockAtOffset = bot.blockAt(blockCoords.plus(offset));
        if (!blockAtOffset ||
            !blockAtOffset.shapes.some((s) => s[0] === 0 &&
                s[3] === 1 &&
                s[1] === 0 &&
                s[4] === 1 &&
                s[2] === 0 &&
                s[5] === 1)) {
            isExposed = true;
            break;
        }
    }
    if (!isExposed)
        return false;
    // Raycast to check visibility
    const eyePosition = bot.entity.position.offset(0, exports.BOT_EYE_HEIGHT, 0);
    for (const shape of block.shapes) {
        const bb = mineflayer_util_plugin_1.AABB.fromShape(shape, blockCoords);
        const vertices = bb.expand(-1e-3, -1e-3, -1e-3).toVertices();
        for (const vertex of vertices) {
            const dir = vertex.minus(eyePosition).normalize().scale(0.3);
            const hit = bot.world.raycast(eyePosition, dir, 256 * 10);
            if ((_a = hit === null || hit === void 0 ? void 0 : hit.position) === null || _a === void 0 ? void 0 : _a.equals(blockCoords))
                return true;
        }
    }
    return false;
}
function getGoodPathfindingTarget(bot, targetCoords) {
    // Create a set to keep track of checked positions to avoid duplicates
    const checkedPositions = new Set();
    // Queue for breadth-first search
    const queue = [
        { pos: targetCoords.clone(), distance: 0 },
    ];
    while (queue.length > 0) {
        const { pos, distance } = queue.shift();
        // Generate a string key for the position to check against the set
        const posKey = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
        // Skip if we've already checked this position
        if (checkedPositions.has(posKey)) {
            continue;
        }
        // Mark as checked
        checkedPositions.add(posKey);
        // Check if the block at this position is empty
        const block = bot.blockAt(pos);
        if (!block) {
            return pos; // Found an empty block
        }
        // Stop if we've reached the maximum search radius
        if (distance >= 5) {
            continue;
        }
        // Add adjacent positions to the queue (all 6 directions)
        const offsets = [
            new vec3_1.Vec3(1, 0, 0),
            new vec3_1.Vec3(-1, 0, 0),
            new vec3_1.Vec3(0, 1, 0),
            new vec3_1.Vec3(0, -1, 0),
            new vec3_1.Vec3(0, 0, 1),
            new vec3_1.Vec3(0, 0, -1),
        ];
        for (const offset of offsets) {
            const nextPos = pos.clone().add(offset);
            queue.push({ pos: nextPos, distance: distance + 1 });
        }
    }
    // If no empty block was found within the radius, return null
    return null;
}
exports.default = getGoodPathfindingTarget;

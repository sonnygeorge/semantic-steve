"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_EYE_HEIGHT = exports.asyncSleep = void 0;
exports.blockExistsAt = blockExistsAt;
exports.getDurabilityPercentRemaining = getDurabilityPercentRemaining;
exports.getDurabilityPercentRemainingString = getDurabilityPercentRemainingString;
exports.isBlockVisible = isBlockVisible;
exports.getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable = getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable;
exports.isBotOccupyingCoords = isBotOccupyingCoords;
const vec3_1 = require("vec3");
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
const constants_1 = require("./constants");
const asyncSleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.asyncSleep = asyncSleep;
function blockExistsAt(bot, coords) {
    const block = bot.blockAt(coords);
    return block !== null && block.type !== 0;
}
function getDurabilityPercentRemaining(item) {
    if (item.durabilityUsed) {
        return Math.floor((1 - item.durabilityUsed / item.maxDurability) * 100);
    }
}
function getDurabilityPercentRemainingString(item) {
    const durability = getDurabilityPercentRemaining(item);
    if (durability !== undefined) {
        return `${durability}%`;
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
function getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(bot, coords) {
    // Coords are not placeable if already occupied by a block
    const block = bot.blockAt(coords);
    if (blockExistsAt(bot, coords)) {
        return;
    }
    const adjacentOffsets = [
        new vec3_1.Vec3(0, -1, 0), // Below
        new vec3_1.Vec3(0, 1, 0), // Above
        new vec3_1.Vec3(-1, 0, 0), // West
        new vec3_1.Vec3(1, 0, 0), // East
        new vec3_1.Vec3(0, 0, -1), // North
        new vec3_1.Vec3(0, 0, 1), // South
    ];
    const eyePosition = bot.entity.position.offset(0, bot.entity.height, 0);
    for (const offset of adjacentOffsets) {
        const adjacentPos = coords.clone().add(offset);
        const adjacentBlock = bot.blockAt(adjacentPos);
        // Skip if the adjacent block doesn't exist or is air
        if (adjacentBlock == null || adjacentBlock.type == 0) {
            continue;
        }
        // Skip if not visible
        if (!isBlockVisible(bot, adjacentBlock, adjacentPos)) {
            continue;
        }
        // Skip if out of reach
        const distanceToReferenceBlock = eyePosition.distanceTo(adjacentBlock.position.clone().offset(0.5, 0.5, 0.5));
        if (distanceToReferenceBlock > constants_1.MAX_PLACEMENT_REACH) {
            continue;
        }
        // Use this block as reference with the opposite face vector
        return [adjacentBlock, offset.scaled(-1)];
    }
}
function isBotOccupyingCoords(bot, coords) {
    const botPosition = bot.entity.position.floored();
    const botPositionHead = botPosition.offset(0, 1, 0);
    // Check if the coordinates match the bot's position or the block above (head position)
    return coords.equals(botPosition) || coords.equals(botPositionHead);
}

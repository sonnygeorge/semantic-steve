"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBotOccupyingCoords = isBotOccupyingCoords;
exports.getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable = getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable;
exports.getAllPlaceableCoords = getAllPlaceableCoords;
exports.getPlaceableCoords = getPlaceableCoords;
const assert_1 = __importDefault(require("assert"));
const constants_1 = require("../constants");
const cubed_meter_1 = require("./cubed-meter");
const visibility_1 = require("./visibility");
const block_1 = require("./block");
function isBotOccupyingCoords(bot, coords) {
    // Get the bot's actual position (which can be fractional)
    const botPos = bot.entity.position;
    // Get bot's hitbox dimensions (typically ~0.6 width and ~1.8 height for players)
    const width = bot.entity.width || 0.6;
    const height = bot.entity.height || 1.8;
    // Calculate the bot's bounding box
    const halfWidth = width / 2;
    const botMinX = botPos.x - halfWidth;
    const botMaxX = botPos.x + halfWidth;
    const botMinZ = botPos.z - halfWidth;
    const botMaxZ = botPos.z + halfWidth;
    const botMinY = botPos.y;
    const botMaxY = botPos.y + height;
    // Check if the given integer coordinates overlap with any part of the bot's bounding box
    return (coords.x >= Math.floor(botMinX) &&
        coords.x <= Math.floor(botMaxX) &&
        coords.z >= Math.floor(botMinZ) &&
        coords.z <= Math.floor(botMaxZ) &&
        coords.y >= Math.floor(botMinY) &&
        coords.y <= Math.floor(botMaxY));
}
function getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(bot, coords) {
    // Coords are not placeable if already occupied by a block
    if ((0, block_1.blockExistsAt)(bot, coords)) {
        return;
    }
    // Coords are not placeable if occupied by the bot
    if (isBotOccupyingCoords(bot, coords)) {
        return;
    }
    // Coords are not placeable if their contents are not theoretically visible
    if (!(0, visibility_1.areContentsOfCoordsVisible)(bot, coords)) {
        return;
    }
    const cubedMeter = new cubed_meter_1.CubedMeter(bot, coords);
    for (const [side, offset] of Object.entries(constants_1.ADJACENT_OFFSETS)) {
        const adjacentCoords = coords.clone().add(offset);
        const adjacentBlock = bot.blockAt(adjacentCoords);
        if (!(0, block_1.isBlock)(adjacentBlock)) {
            continue;
        }
        (0, assert_1.default)(adjacentBlock !== null);
        const connectingFace = cubedMeter.faces.get(side);
        (0, assert_1.default)(connectingFace !== undefined);
        // Skip if out of reach for placement
        if (!connectingFace.isWithinReachForPlacement()) {
            continue;
        }
        // Skip if the bot's line of sight can't reach
        if (!(0, visibility_1.canRaycastToOrBeyondCubedMeterFace)(bot, connectingFace)) {
            continue;
        }
        // Use this block as reference with the opposite face vector
        return [adjacentBlock, offset.scaled(-1)];
    }
}
function getAllPlaceableCoords(bot) {
    // Helper for readability
    function isTooSmallAnOffsetToBeWorthChecking(x, y, z) {
        // If at least one coordinate is 0 and others are 0, 1, or -1
        // (i.e., the manhattan distance is less than 2^(1/2))
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);
        const isZero = Number(absX === 0) + Number(absY === 0) + Number(absZ === 0);
        const isZeroOrOne = absX <= 1 && absY <= 1 && absZ <= 1;
        return isZero >= 1 && isZeroOrOne;
    }
    const placeableCoords = [];
    const botPosition = bot.entity.position.floored();
    const radius = constants_1.MAX_PLACEMENT_REACH + 1;
    // Iterate through all blocks within the radius
    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
                if (isTooSmallAnOffsetToBeWorthChecking(x, y, z)) {
                    continue;
                }
                const coords = botPosition.offset(x, y, z);
                // Check if the coordinates are placeable
                const refernceBlockAndFaceVector = getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(bot, coords);
                if (refernceBlockAndFaceVector !== undefined) {
                    placeableCoords.push(coords);
                }
            }
        }
    }
    // Sort coordinates by distance to bot (closest first)
    placeableCoords.sort((a, b) => {
        const distanceA = botPosition.distanceTo(a);
        const distanceB = botPosition.distanceTo(b);
        return distanceA - distanceB;
    });
    return placeableCoords;
}
function getPlaceableCoords(bot) {
    const placeableCoords = getAllPlaceableCoords(bot);
    if (placeableCoords.length > 0) {
        return placeableCoords[0];
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoodPathfindingTarget = getGoodPathfindingTarget;
const vec3_1 = require("vec3");
const block_1 = require("../../utils/block");
/**
 * Finds a good pathfinding target by searching in the octant opposite to the bot's position
 * relative to the target coordinates for an empty block, within the immediate surroundings
 * radius minus one.
 *
 * If no blocks are empty, this function will return the coordinates that are one block
 * diagonally adjacent in the octant that is opposite to the bot's position.
 *
 * @param bot - The Mineflayer bot
 * @param targetCoords - The target coordinates
 * @returns A Vec3 coordinate to a valid pathfinding target, or null if none found
 */
function getGoodPathfindingTarget(bot, targetCoords) {
    if (!(0, block_1.blockExistsAt)(bot, targetCoords)) {
        return targetCoords; // If the target coordinates are already empty, return them
    }
    const maxSearchRadius = bot.envState.surroundings.radii.immediateSurroundingsRadius - 1;
    // Determine the octant the bot is in relative to targetCoords
    const botOctant = getBotOctant(bot.entity.position, targetCoords);
    // Get the opposite octant
    const oppositeOctant = getOppositeOctant(botOctant);
    // Create a set to keep track of checked positions to avoid duplicates
    const checkedPositions = new Set();
    const searchQueue = [
        { pos: targetCoords.clone(), distance: 0 },
    ];
    while (searchQueue.length > 0) {
        const { pos, distance } = searchQueue.shift();
        // Generate a string key for the position to check against the set
        const posKey = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
        // Skip if we've already checked this position
        if (checkedPositions.has(posKey)) {
            continue;
        }
        // Mark as checked
        checkedPositions.add(posKey);
        // Check if the block at this position is empty
        if (!(0, block_1.blockExistsAt)(bot, pos)) {
            return pos; // Found an empty block
        }
        // Stop if we've reached the maximum search radius
        if (distance >= maxSearchRadius) {
            continue;
        }
        // Define offsets based on the opposite octant
        const offsets = getOffsetsForOctant(oppositeOctant);
        for (const offset of offsets) {
            const nextPos = pos.clone().add(offset);
            // Ensure we stay within the desired octant relative to original targetCoords
            if (isInOctant(nextPos, targetCoords, oppositeOctant)) {
                searchQueue.push({ pos: nextPos, distance: distance + 1 });
            }
        }
    }
    // If no empty block was found within the radius, the diagonally adjacent block
    // opposite the bot's position
    const offsets = getOffsetsForOctant(oppositeOctant);
    const offset = new vec3_1.Vec3(offsets[0].x, offsets[1].y, offsets[2].z);
    return targetCoords.clone().add(offset);
}
/**
 * Determines which octant the bot is in relative to the target coordinates
 */
function getBotOctant(botPosition, targetCoords) {
    return {
        xDirection: botPosition.x >= targetCoords.x ? "east" : "west",
        yDirection: botPosition.y >= targetCoords.y ? "up" : "down",
        zDirection: botPosition.z >= targetCoords.z ? "south" : "north",
    };
}
/**
 * Returns the opposite octant
 */
function getOppositeOctant(octant) {
    return {
        xDirection: octant.xDirection === "east" ? "west" : "east",
        yDirection: octant.yDirection === "up" ? "down" : "up",
        zDirection: octant.zDirection === "south" ? "north" : "south",
    };
}
/**
 * Returns the appropriate offsets for exploring in a given octant
 */
function getOffsetsForOctant(octant) {
    const offsets = [];
    // X direction
    if (octant.xDirection === "east") {
        offsets.push(new vec3_1.Vec3(1, 0, 0));
    }
    else {
        // west
        offsets.push(new vec3_1.Vec3(-1, 0, 0));
    }
    // Y direction
    if (octant.yDirection === "up") {
        offsets.push(new vec3_1.Vec3(0, 1, 0));
    }
    else {
        // down
        offsets.push(new vec3_1.Vec3(0, -1, 0));
    }
    // Z direction
    if (octant.zDirection === "south") {
        offsets.push(new vec3_1.Vec3(0, 0, 1));
    }
    else {
        // north
        offsets.push(new vec3_1.Vec3(0, 0, -1));
    }
    return offsets;
}
/**
 * Checks if a position is within the specified octant relative to the target coordinates
 */
function isInOctant(position, targetCoords, octant) {
    // X check
    const xCheck = octant.xDirection === "east"
        ? position.x >= targetCoords.x
        : position.x <= targetCoords.x;
    // Y check
    const yCheck = octant.yDirection === "up"
        ? position.y >= targetCoords.y
        : position.y <= targetCoords.y;
    // Z check
    const zCheck = octant.zDirection === "south"
        ? position.z >= targetCoords.z
        : position.z <= targetCoords.z;
    return xCheck && yCheck && zCheck;
}

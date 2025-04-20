"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_EYE_HEIGHT = exports.asyncSleep = void 0;
exports.isBlock = isBlock;
exports.blockExistsAt = blockExistsAt;
exports.getDurabilityPercentRemaining = getDurabilityPercentRemaining;
exports.getDurabilityPercentRemainingString = getDurabilityPercentRemainingString;
exports.isBlockVisible = isBlockVisible;
exports.isVisibilityOfCoordsBlockedByAdjacentBlocks = isVisibilityOfCoordsBlockedByAdjacentBlocks;
exports.areCoordsVisible = areCoordsVisible;
exports.isBotOccupyingCoords = isBotOccupyingCoords;
exports.getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable = getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable;
exports.getAllPlaceableCoords = getAllPlaceableCoords;
exports.getASetOfPlaceableCoords = getASetOfPlaceableCoords;
const vec3_1 = require("vec3");
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
const constants_1 = require("./constants");
const asyncSleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.asyncSleep = asyncSleep;
function isBlock(block) {
    return block !== null && block.type !== 0;
}
function blockExistsAt(bot, coords) {
    const block = bot.blockAt(coords);
    return isBlock(block);
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
// function generateFacePointsForRaycasting(blockCoords: Vec3): Vec3[] {
//   const points: Vec3[] = [];
//   // Tiny distance from edge to avoid theoretical issue of seeing through space
//   // between diagonally adjacent block.
//   const inset = 0.0005;
//   // Function to add points for a single face
//   const addFacePoints = (
//     fixedAxis: "x" | "y" | "z",
//     fixedValue: number,
//     axis1: "x" | "y" | "z",
//     axis2: "x" | "y" | "z"
//   ) => {
//     // Center point
//     const centerPoint = new Vec3(0, 0, 0);
//     centerPoint[fixedAxis] = fixedValue;
//     centerPoint[axis1] = blockCoords[axis1] + 0.5;
//     centerPoint[axis2] = blockCoords[axis2] + 0.5;
//     points.push(centerPoint);
//     // Four inset points (avoiding extreme edge of corners with inset)
//     const insetPoints = [
//       [inset, inset],
//       [inset, 1 - inset],
//       [1 - inset, inset],
//       [1 - inset, 1 - inset],
//     ];
//     for (const [offset1, offset2] of insetPoints) {
//       const point = new Vec3(0, 0, 0);
//       point[fixedAxis] = fixedValue;
//       point[axis1] = blockCoords[axis1] + offset1;
//       point[axis2] = blockCoords[axis2] + offset2;
//       points.push(point);
//     }
//   };
//   // Add points for each face
//   addFacePoints("x", blockCoords.x, "y", "z"); // -X face
//   addFacePoints("x", blockCoords.x + 1, "y", "z"); // +X face
//   addFacePoints("y", blockCoords.y, "x", "z"); // -Y face
//   addFacePoints("y", blockCoords.y + 1, "x", "z"); // +Y face
//   addFacePoints("z", blockCoords.z, "x", "y"); // -Z face
//   addFacePoints("z", blockCoords.z + 1, "x", "y"); // +Z face
//   return points;
// }
// export function areCoordsVisible(bot: Bot, coords: Vec3): boolean {
//   // Check if block has exposed sides
//   const offsets = [
//     new Vec3(1, 0, 0),
//     new Vec3(-1, 0, 0),
//     new Vec3(0, 1, 0),
//     new Vec3(0, -1, 0),
//     new Vec3(0, 0, 1),
//     new Vec3(0, 0, -1),
//   ];
//   // Check if at least one side is exposed
//   let isExposed = false;
//   for (const offset of offsets) {
//     const blockAtOffset = bot.blockAt(coords.plus(offset));
//     if (
//       !blockAtOffset ||
//       !blockAtOffset.shapes.some(
//         (s) =>
//           s[0] === 0 &&
//           s[3] === 1 &&
//           s[1] === 0 &&
//           s[4] === 1 &&
//           s[2] === 0 &&
//           s[5] === 1
//       )
//     ) {
//       isExposed = true;
//       break;
//     }
//   }
//   if (!isExposed) return false;
//   // Raycast to check visibility
//   const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
//   // Define sample points on each face of the block (avoiding extreme corners)
//   // Use 5 points per face: center + 4 points slightly inward from the corners
//   const facePoints = generateFacePointsForRaycasting(coords);
//   for (const point of facePoints) {
//     const dir = point.minus(eyePosition).normalize().scale(0.3);
//     const hit = bot.world.raycast(eyePosition, dir, 256 * 10);
//     if (hit?.position?.equals(coords)) return true;
//   }
//   return false;
// }
function isVisibilityOfCoordsBlockedByAdjacentBlocks(bot, coords) {
    // Bot's eye position
    const eyePosition = bot.entity.position.offset(0, exports.BOT_EYE_HEIGHT, 0);
    // Define face centers and their corresponding offsets
    const faces = [
        { center: coords.plus(new vec3_1.Vec3(1, 0.5, 0.5)), offset: new vec3_1.Vec3(1, 0, 0) }, // +X face
        { center: coords.plus(new vec3_1.Vec3(0, 0.5, 0.5)), offset: new vec3_1.Vec3(-1, 0, 0) }, // -X face
        { center: coords.plus(new vec3_1.Vec3(0.5, 1, 0.5)), offset: new vec3_1.Vec3(0, 1, 0) }, // +Y face
        { center: coords.plus(new vec3_1.Vec3(0.5, 0, 0.5)), offset: new vec3_1.Vec3(0, -1, 0) }, // -Y face
        { center: coords.plus(new vec3_1.Vec3(0.5, 0.5, 1)), offset: new vec3_1.Vec3(0, 0, 1) }, // +Z face
        { center: coords.plus(new vec3_1.Vec3(0.5, 0.5, 0)), offset: new vec3_1.Vec3(0, 0, -1) }, // -Z face
    ];
    // Calculate distances to face centers and sort by distance
    const facesWithDistance = faces.map((face) => (Object.assign(Object.assign({}, face), { distance: eyePosition.distanceTo(face.center) })));
    const closestFaces = facesWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    // Check if all closest faces are blocked by full blocks
    for (const { offset } of closestFaces) {
        const blockAtOffset = bot.blockAt(coords.plus(offset));
        if (!blockAtOffset || blockAtOffset.boundingBox !== "block") {
            return false;
        }
    }
    return true;
}
/**
 * Checks if the 1x1 space at the specified coordinates is visible by the bot,
 * regardless of whether it contains air or a solid block.
 * @param bot - The Mineflayer bot instance
 * @param coords - The coordinates to check visibility for
 * @returns boolean indicating if the coordinates are visible
 */
function areCoordsVisible(bot, coords) {
    if (isVisibilityOfCoordsBlockedByAdjacentBlocks(bot, coords)) {
        return false;
    }
    // Get the bot's eye position
    const eyePosition = bot.entity.position.offset(0, exports.BOT_EYE_HEIGHT, 0);
    // Create a vector pointing to the center of the target block
    const targetPosition = coords.clone().offset(0.5, 0.5, 0.5);
    // Calculate the direction vector from eye to target
    const direction = targetPosition.minus(eyePosition);
    // Get the distance to the target
    const targetDistance = direction.norm();
    // Normalize the direction vector
    direction.normalize();
    // Use the bot's world.raycast method to check for obstructions
    const raycastResult = bot.world.raycast(eyePosition, direction, targetDistance + 1 // Look slightly beyond to ensure we catch the target block
    // // Only consider solid blocks as blockers
    // (block) => block && block.boundingBox === "block"
    );
    // If there's no raycast result, it means there are no obstructions
    // all the way to (and beyond) our target position
    if (!raycastResult) {
        return true;
    }
    // Calculate the distance to the edge of the target block that's closest to the bot
    // First, determine which face of the block would be encountered first
    // This is a simplified AABB intersection calculation
    const blockMin = coords.clone(); // Minimum corner of the block
    const blockMax = coords.clone().offset(1, 1, 1); // Maximum corner of the block
    // Calculate distances to each of the 6 faces of the block
    // We only care about the closest face (the one the ray would hit first)
    let minDistanceToBlock = Number.POSITIVE_INFINITY;
    // Check x-axis faces
    if (direction.x !== 0) {
        const t1 = (blockMin.x - eyePosition.x) / direction.x;
        const t2 = (blockMax.x - eyePosition.x) / direction.x;
        const tMin = Math.min(t1, t2);
        if (tMin >= 0 && tMin < minDistanceToBlock) {
            minDistanceToBlock = tMin;
        }
    }
    // Check y-axis faces
    if (direction.y !== 0) {
        const t1 = (blockMin.y - eyePosition.y) / direction.y;
        const t2 = (blockMax.y - eyePosition.y) / direction.y;
        const tMin = Math.min(t1, t2);
        if (tMin >= 0 && tMin < minDistanceToBlock) {
            minDistanceToBlock = tMin;
        }
    }
    // Check z-axis faces
    if (direction.z !== 0) {
        const t1 = (blockMin.z - eyePosition.z) / direction.z;
        const t2 = (blockMax.z - eyePosition.z) / direction.z;
        const tMin = Math.min(t1, t2);
        if (tMin >= 0 && tMin < minDistanceToBlock) {
            minDistanceToBlock = tMin;
        }
    }
    // Calculate distance to the ray hit position
    const hitDistance = eyePosition.distanceTo(raycastResult.position);
    // The block is visible if there are no obstructions before reaching it
    // Add a small epsilon for floating point precision
    return hitDistance >= minDistanceToBlock - 0.001;
}
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
    // Coords are not placeable if not visible
    if (!areCoordsVisible(bot, coords)) {
        console.log(`[${coords.x}, ${coords.y}, ${coords.z}] is not visible`);
        return;
    }
    console.log(`[${coords.x}, ${coords.y}, ${coords.z}] is visible`);
    // Coords are not placeable if already occupied by a block
    if (blockExistsAt(bot, coords)) {
        return;
    }
    // Coords are not placeable if occupied by the bot
    if (isBotOccupyingCoords(bot, coords)) {
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
    const eyePosition = bot.entity.position.offset(0, exports.BOT_EYE_HEIGHT, 0);
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
function getAllPlaceableCoords(bot) {
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
function getASetOfPlaceableCoords(bot) {
    const placeableCoords = getAllPlaceableCoords(bot);
    if (placeableCoords.length > 0) {
        return placeableCoords[0];
    }
    return undefined;
}

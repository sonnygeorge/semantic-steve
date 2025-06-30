"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areContentsOfCoordsVisible = areContentsOfCoordsVisible;
exports.isBlockVisible = isBlockVisible;
exports.canRaycastToOrBeyondCubedMeterFace = canRaycastToOrBeyondCubedMeterFace;
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
const generic_1 = require("./generic");
const block_1 = require("./block");
const cubed_meter_1 = require("./cubed-meter");
const constants_1 = require("../constants");
const misc_1 = require("./misc");
/**
 * Checks if the bot can see the contents of any given coordinates, i.e., its line of
 * sight can reach or penetrate the 3 closest faces of the cubed meter.
 *
 * Crucially, this function does NOT raycast to the extreme edges of the faces which can
 * hit through corners of diagonally adjacent encasing neighbor blocks and lead to false
 * positives.
 *
 * @param bot - The Mineflayer bot instance
 * @param coords - The coordinates to check visibility for
 * @returns true if the contents of the coordinates are visible, false otherwise
 */
function areContentsOfCoordsVisible(bot, coords, strategy = "cheap") {
    // Get bot position with eye height
    const cubedMeter = new cubed_meter_1.CubedMeter(bot, coords);
    const threeClosestFaces = cubedMeter.getThreeClosestFaces();
    // Check if the bot can raycast to or beyond any of the three closest faces
    const nRaycastPoints = strategy === "cheap" ? 10 : 24;
    for (const [side, face] of threeClosestFaces) {
        if (canRaycastToOrBeyondCubedMeterFace(bot, face, nRaycastPoints)) {
            return true;
        }
    }
    return false;
}
function isBlockVisible(bot, block, blockCoords, strategy = "cheap") {
    var _a;
    const cubedMeter = new cubed_meter_1.CubedMeter(bot, blockCoords);
    let isExposed = false;
    for (const [side, face] of cubedMeter.getThreeClosestFaces()) {
        if (strategy === "cheap") {
            // Cheap strategy: If block has three closest faces covered by full blocks
            // NOTE: We will still attempt to raycast to the block if the faces are fully
            // covered by non-full blocks—e.g., slabs, stairs, etc.—leading to false positives
            // if the raycast reaches the corner the block (despite being covered)
            const offset = constants_1.ADJACENT_OFFSETS[side];
            const adjacentCoords = blockCoords.offset(offset.x, offset.y, offset.z);
            const allowedBoundingBoxes = ["block"];
            if (!(0, block_1.blockExistsAt)(bot, adjacentCoords, allowedBoundingBoxes)) {
                isExposed = true;
                break;
            }
        }
        else {
            // Expensive strategy: Check if the bot can raycast to faces (excluding corners)
            // NOTE: This way, we will have already weeded out corner-based false positives by the
            // time we reach raycasting.
            const nRaycastPoints = 10; // Low-ish value to not incur high cost.
            if (!canRaycastToOrBeyondCubedMeterFace(bot, face, nRaycastPoints)) {
                isExposed = true;
                break;
            }
        }
    }
    if (!isExposed)
        return false;
    // Try raycasting to all vertices of the block's shapes
    const eyePosition = (0, misc_1.getCurEyePos)(bot);
    for (const shape of block.shapes) {
        const bb = mineflayer_util_plugin_1.AABB.fromShape(shape, blockCoords); // TODO: Remove dependency on AABB
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
/**
 * Checks if the bot can raycast to or beyond a specified "block face", i.e., side of
 * any arbitrary coordinate cube, regardless of whether a block is in it or not.
 *
 * Ensures points are never flush with the face edges and thus, is useful for avoiding
 * corner-based false positives when checking visibility.
 *
 * @param bot - The Mineflayer bot instance
 * @param face - The CubedMeterFace to check if the bots line of sight can reach
 * @param nRaycastPoints - Number of points to interpolate on the face (default: 24)
 * @returns true if any raycast hits something beyond the face, false otherwise
 */
function canRaycastToOrBeyondCubedMeterFace(bot, face, nRaycastPoints = 24) {
    const [c1, c2, c3, c4] = face.corners;
    const widthPoints = Math.ceil(Math.sqrt(nRaycastPoints));
    const heightPoints = widthPoints; // Should always be a square
    const eyePosition = (0, misc_1.getCurEyePos)(bot);
    // Relative padding that adapts to the grid size prevents points from being flush
    const padding = 1 / (widthPoints * 2);
    // Generate points uniformly distributed on the face with padding
    for (let i = 0; i < widthPoints; i++) {
        for (let j = 0; j < heightPoints; j++) {
            if (i * widthPoints + j >= nRaycastPoints)
                break;
            // Interpolate to get a point on the face with padding
            // Map from [0, gridSize-1] to [padding, 1-padding]
            const u = padding + (i / (widthPoints - 1)) * (1 - 2 * padding);
            const v = padding + (j / (heightPoints - 1)) * (1 - 2 * padding);
            const point = (0, generic_1.bilinearInterpolate)(u, v, c1, c2, c3, c4);
            // Perform raycast
            const dir = point.clone().subtract(eyePosition).normalize().scale(0.3);
            const hit = bot.world.raycast(eyePosition, dir, 256 * 10);
            const distanceToFacePoint = eyePosition.distanceTo(point);
            if (hit && hit.intersect.distanceTo(eyePosition) >= distanceToFacePoint) {
                return true;
            }
        }
    }
    return false; // Raycasts all hit early
}

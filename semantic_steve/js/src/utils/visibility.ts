import { Bot } from "mineflayer";
import { Block as PBlock } from "prismarine-block";
import { Vec3 } from "vec3";
import { AABB } from "@nxg-org/mineflayer-util-plugin";
import { BOT_EYE_HEIGHT } from "../constants";
import { bilinearInterpolate } from "./generic";
import { blockExistsAt } from "./block";
import { CubedMeter, CubedMeterFace } from "./cubed-meter";
import { ADJACENT_OFFSETS } from "../constants";

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
export function areContentsOfCoordsVisible(
  bot: Bot,
  coords: Vec3,
  strategy: "cheap" | "expensive" = "cheap"
): boolean {
  // Get bot position with eye height
  const cubedMeter = new CubedMeter(bot, coords);
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

export function isBlockVisible(
  bot: Bot,
  block: PBlock,
  blockCoords: Vec3,
  strategy: "cheap" | "expensive" = "cheap"
): boolean {
  const cubedMeter = new CubedMeter(bot, blockCoords);
  let isExposed = false;
  for (const [side, face] of cubedMeter.getThreeClosestFaces()) {
    if (strategy === "cheap") {
      // Cheap strategy: If block has three closest faces covered by full blocks
      // NOTE: We will still attempt to raycast to the block if the faces are fully
      // covered by non-full blocks—e.g., slabs, stairs, etc.—leading to false positives
      // if the raycast reaches the corner the block (despite being covered)
      const offset = ADJACENT_OFFSETS[side];
      const adjacentCoords = blockCoords.offset(offset.x, offset.y, offset.z);
      const allowedBoundingBoxes = ["block"];
      if (!blockExistsAt(bot, adjacentCoords, allowedBoundingBoxes)) {
        isExposed = true;
        break;
      }
    } else {
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
  if (!isExposed) return false;
  // Try raycasting to all vertices of the block's shapes
  const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
  for (const shape of block.shapes) {
    const bb = AABB.fromShape(shape, blockCoords); // TODO: Remove dependency on AABB
    const vertices = bb.expand(-1e-3, -1e-3, -1e-3).toVertices();
    for (const vertex of vertices) {
      const dir = vertex.minus(eyePosition).normalize().scale(0.3);
      const hit = bot.world.raycast(eyePosition, dir, 256 * 10);
      if (hit?.position?.equals(blockCoords)) return true;
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
export function canRaycastToOrBeyondCubedMeterFace(
  bot: any,
  face: CubedMeterFace,
  nRaycastPoints: number = 24
): boolean {
  const [c1, c2, c3, c4] = face.corners;
  const widthPoints = Math.ceil(Math.sqrt(nRaycastPoints));
  const heightPoints = widthPoints; // Should always be a square
  const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
  // Relative padding that adapts to the grid size prevents points from being flush
  const padding = 1 / (widthPoints * 2);
  // Generate points uniformly distributed on the face with padding
  for (let i = 0; i < widthPoints; i++) {
    for (let j = 0; j < heightPoints; j++) {
      if (i * widthPoints + j >= nRaycastPoints) break;
      // Interpolate to get a point on the face with padding
      // Map from [0, gridSize-1] to [padding, 1-padding]
      const u = padding + (i / (widthPoints - 1)) * (1 - 2 * padding);
      const v = padding + (j / (heightPoints - 1)) * (1 - 2 * padding);
      const point = bilinearInterpolate(u, v, c1, c2, c3, c4);
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

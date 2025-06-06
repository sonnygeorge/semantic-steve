import assert from "assert";
import { Bot } from "mineflayer";
import { Block as PBlock } from "prismarine-block";
import { Vec3 } from "vec3";
import { MAX_PLACEMENT_REACH, ADJACENT_OFFSETS } from "../constants";
import { CubedMeter } from "./cubed-meter";
import {
  areContentsOfCoordsVisible,
  canRaycastToOrBeyondCubedMeterFace,
} from "./visibility";
import { blockExistsAt, isBlock } from "./block";
import { ConnectingSide } from "../types";

export function isBotOccupyingCoords(bot: Bot, coords: Vec3): boolean {
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
  return (
    coords.x >= Math.floor(botMinX) &&
    coords.x <= Math.floor(botMaxX) &&
    coords.z >= Math.floor(botMinZ) &&
    coords.z <= Math.floor(botMaxZ) &&
    coords.y >= Math.floor(botMinY) &&
    coords.y <= Math.floor(botMaxY)
  );
}

export function getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(
  bot: Bot,
  coords: Vec3
): [PBlock, Vec3] | undefined {
  // Coords are not placeable if already occupied by a block
  if (blockExistsAt(bot, coords)) {
    return;
  }

  // Coords are not placeable if occupied by the bot
  if (isBotOccupyingCoords(bot, coords)) {
    return;
  }

  // Coords are not placeable if their contents are not theoretically visible
  if (!areContentsOfCoordsVisible(bot, coords)) {
    return;
  }

  const cubedMeter: CubedMeter = new CubedMeter(bot, coords);
  for (const [side, offset] of Object.entries(ADJACENT_OFFSETS)) {
    const adjacentCoords = coords.clone().add(offset);
    const adjacentBlock = bot.blockAt(adjacentCoords);
    if (!isBlock(adjacentBlock)) {
      continue;
    }
    assert(adjacentBlock !== null);

    const connectingFace = cubedMeter.faces.get(side as ConnectingSide);
    assert(connectingFace !== undefined);

    // Skip if out of reach for placement
    if (!connectingFace.isWithinReachForPlacement()) {
      continue;
    }

    // Skip if the bot's line of sight can't reach
    if (!canRaycastToOrBeyondCubedMeterFace(bot, connectingFace)) {
      continue;
    }

    // Use this block as reference with the opposite face vector
    return [adjacentBlock, offset.scaled(-1)];
  }
}

export function getAllPlaceableCoords(bot: Bot): Vec3[] {
  // Helper for readability
  function isTooSmallAnOffsetToBeWorthChecking(
    x: number,
    y: number,
    z: number
  ): boolean {
    // If at least one coordinate is 0 and others are 0, 1, or -1
    // (i.e., the manhattan distance is less than 2^(1/2))
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);
    const isZero = Number(absX === 0) + Number(absY === 0) + Number(absZ === 0);
    const isZeroOrOne = absX <= 1 && absY <= 1 && absZ <= 1;
    return isZero >= 1 && isZeroOrOne;
  }

  const placeableCoords: Vec3[] = [];
  const botPosition = bot.entity.position.floored();
  const radius = MAX_PLACEMENT_REACH + 1;
  // Iterate through all blocks within the radius
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        if (isTooSmallAnOffsetToBeWorthChecking(x, y, z)) {
          continue;
        }
        const coords = botPosition.offset(x, y, z);
        // Check if the coordinates are placeable
        const refernceBlockAndFaceVector =
          getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(bot, coords);
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

export function getPlaceableCoords(bot: Bot): Vec3 | undefined {
  const placeableCoords = getAllPlaceableCoords(bot);
  if (placeableCoords.length > 0) {
    return placeableCoords[0];
  }
}

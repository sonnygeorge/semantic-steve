import { Bot } from "mineflayer";
import { Item as PItem } from "prismarine-item";
import { Block as PBlock } from "prismarine-block";
import { Vec3 } from "vec3";
import { AABB } from "@nxg-org/mineflayer-util-plugin";
import { MAX_PLACEMENT_REACH } from "./constants";
import { dir } from "console";



export function getDurabilityPercentRemaining(item: PItem): number | undefined {
  if (item.durabilityUsed) {
    return Math.floor((1 - item.durabilityUsed / item.maxDurability) * 100);
  }
}

export function getDurabilityPercentRemainingString(
  item: PItem
): string | undefined {
  const durability = getDurabilityPercentRemaining(item);
  if (durability !== undefined) {
    return `${durability}%`;
  }
}


export function isBlockRaycastVisible(
  bot: Bot,
  block: PBlock,
  blockCoords: Vec3
): boolean {
  // Check if block has exposed sides
  const offsets = [
    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),
    new Vec3(0, 1, 0),
    new Vec3(0, -1, 0),
    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
  ];

  // Check if at least one side is exposed
  let isExposed = false;
  for (const offset of offsets) {
    const blockAtOffset = bot.blockAt(blockCoords.plus(offset));
    if (
      !blockAtOffset ||
      !blockAtOffset.shapes.some(
        (s) =>
          s[0] === 0 &&
          s[3] === 1 &&
          s[1] === 0 &&
          s[4] === 1 &&
          s[2] === 0 &&
          s[5] === 1
      )
    ) {
      isExposed = true;
      break;
    }
  }

  if (!isExposed) return false;

  // Raycast to check visibility
  const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);

  for (const shape of block.shapes) {
    const bb = AABB.fromShape(shape, blockCoords);
    const vertices = bb.expand(-1e-3, -1e-3, -1e-3).toVertices();

    for (const vertex of vertices) {
      const dir = vertex.minus(eyePosition).normalize().scale(0.3);
      const hit = bot.world.raycast(eyePosition, dir, 256 * 10);
      if (hit?.position?.equals(blockCoords)) return true;
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

// This function exists to prevent the cases in which a block is not visible, but
// raytracing would think it is.
export function areCoordsVisible(bot: Bot, coords: Vec3): boolean {
  // Bot's eye position
  const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);

  // Define face centers, offsets, and corners
  const faces = [
    {
      center: coords.plus(new Vec3(1, 0.5, 0.5)),
      offset: new Vec3(1, 0, 0), // +X face
      corners: [
        coords.plus(new Vec3(1, 0, 0)),
        coords.plus(new Vec3(1, 1, 0)),
        coords.plus(new Vec3(1, 0, 1)),
        coords.plus(new Vec3(1, 1, 1)),
      ],
    },
    {
      center: coords.plus(new Vec3(0, 0.5, 0.5)),
      offset: new Vec3(-1, 0, 0), // -X face
      corners: [
        coords.plus(new Vec3(0, 0, 0)),
        coords.plus(new Vec3(0, 1, 0)),
        coords.plus(new Vec3(0, 0, 1)),
        coords.plus(new Vec3(0, 1, 1)),
      ],
    },
    {
      center: coords.plus(new Vec3(0.5, 1, 0.5)),
      offset: new Vec3(0, 1, 0), // +Y face
      corners: [
        coords.plus(new Vec3(0, 1, 0)),
        coords.plus(new Vec3(1, 1, 0)),
        coords.plus(new Vec3(0, 1, 1)),
        coords.plus(new Vec3(1, 1, 1)),
      ],
    },
    {
      center: coords.plus(new Vec3(0.5, 0, 0.5)),
      offset: new Vec3(0, -1, 0), // -Y face
      corners: [
        coords.plus(new Vec3(0, 0, 0)),
        coords.plus(new Vec3(1, 0, 0)),
        coords.plus(new Vec3(0, 0, 1)),
        coords.plus(new Vec3(1, 0, 1)),
      ],
    },
    {
      center: coords.plus(new Vec3(0.5, 0.5, 1)),
      offset: new Vec3(0, 0, 1), // +Z face
      corners: [
        coords.plus(new Vec3(0, 0, 1)),
        coords.plus(new Vec3(1, 0, 1)),
        coords.plus(new Vec3(0, 1, 1)),
        coords.plus(new Vec3(1, 1, 1)),
      ],
    },
    {
      center: coords.plus(new Vec3(0.5, 0.5, 0)),
      offset: new Vec3(0, 0, -1), // -Z face
      corners: [
        coords.plus(new Vec3(0, 0, 0)),
        coords.plus(new Vec3(1, 0, 0)),
        coords.plus(new Vec3(0, 1, 0)),
        coords.plus(new Vec3(1, 1, 0)),
      ],
    },
  ];

  // Calculate distances to face centers and sort by distance
  const facesWithDistance = faces.map((face) => ({
    ...face,
    distance: eyePosition.distanceTo(face.center),
  }));
  const closestFaces = facesWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  for (const { offset, corners } of closestFaces) {
    const adjacentCoords = coords.clone().plus(offset);
    const blockAtOffset = bot.blockAt(adjacentCoords);
    if (!blockAtOffset || blockAtOffset.boundingBox !== "block") {
      // Find the farthest corner of the exposed face from the bot's eye position
      let farCorner = corners[0];
      let maxDistance = eyePosition.distanceTo(farCorner);
      for (const corner of corners.slice(1)) {
        const distance = eyePosition.distanceTo(corner);
        if (distance > maxDistance) {
          maxDistance = distance;
          farCorner = corner;
        }
      }
      // Determine for how long we need to check possibly covering adjacent faces
      let deltaDirExposure: number;
      let deltaInDirOfSideThatEyelineDoesNotCross: number;
      let dirOfExposure: "x" | "y" | "z";
      if (offset.x !== 0) {
        dirOfExposure = "x";
        deltaDirExposure = eyePosition.x - farCorner.x;
        deltaInDirOfSideThatEyelineDoesNotCross = Math.max(
          eyePosition.y - farCorner.y,
          eyePosition.z - farCorner.z
        );
      } else if (offset.y !== 0) {
        dirOfExposure = "y";
        deltaDirExposure = eyePosition.y - farCorner.y;
        deltaInDirOfSideThatEyelineDoesNotCross = Math.max(
          eyePosition.x - farCorner.x,
          eyePosition.z - farCorner.z
        );
      } else {
        dirOfExposure = "z";
        deltaDirExposure = eyePosition.z - farCorner.z;
        deltaInDirOfSideThatEyelineDoesNotCross = Math.max(
          eyePosition.x - farCorner.x,
          eyePosition.y - farCorner.y
        );
      }
      const greatestDeltaToCheckInDirOfExposure =
        deltaDirExposure / deltaInDirOfSideThatEyelineDoesNotCross;

      // Determine if this possibly visible face is obscured by blocks faces extending
      // out from the closer sides of the exposed face
      if (dirOfExposure === "x") {
        const yOffsetInDirOfBot = Number(eyePosition.y > farCorner.y);
        const zOffsetInDirOfBot = Number(eyePosition.z > farCorner.z);
        const xOrientation = Math.sign(deltaDirExposure);
        const maxI = Math.min(
          256,
          Math.abs(greatestDeltaToCheckInDirOfExposure)
        );
        for (let i: number = 0; i <= maxI; i++) {
          const xOffsetToCheck = xOrientation * i + 1;
          const offsetToCheck1 = new Vec3(xOffsetToCheck, yOffsetInDirOfBot, 0);
          const offsetToCheck2 = new Vec3(xOffsetToCheck, 0, zOffsetInDirOfBot);
          const coordsToCheck1 = coords.clone().plus(offsetToCheck1);
          const coordsToCheck2 = coords.clone().plus(offsetToCheck2);
          const blockAtOffset1 = bot.blockAt(coordsToCheck1);
          const blockAtOffset2 = bot.blockAt(coordsToCheck2);
          if (!blockAtOffset1 || blockAtOffset1.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
          if (!blockAtOffset2 || blockAtOffset2.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
        }
      } else if (dirOfExposure === "y") {
        const xOffsetInDirOfBot = Number(eyePosition.x > farCorner.x);
        const zOffsetInDirOfBot = Number(eyePosition.z > farCorner.z);
        const yOrientation = Math.sign(deltaDirExposure);
        const maxI = Math.min(
          256,
          Math.abs(greatestDeltaToCheckInDirOfExposure)
        );
        for (let i: number = 0; i <= maxI; i++) {
          const yOffsetToCheck = yOrientation * i + 1;
          const offsetToCheck1 = new Vec3(0, yOffsetToCheck, zOffsetInDirOfBot);
          const offsetToCheck2 = new Vec3(xOffsetInDirOfBot, yOffsetToCheck, 0);
          const coordsToCheck1 = coords.clone().plus(offsetToCheck1);
          const coordsToCheck2 = coords.clone().plus(offsetToCheck2);
          const blockAtOffset1 = bot.blockAt(coordsToCheck1);
          const blockAtOffset2 = bot.blockAt(coordsToCheck2);
          if (!blockAtOffset1 || blockAtOffset1.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
          if (!blockAtOffset2 || blockAtOffset2.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
        }
      } else {
        // Same process as above, but for z-axis
        const xOffsetInDirOfBot = Number(eyePosition.x > farCorner.x);
        const yOffsetInDirOfBot = Number(eyePosition.y > farCorner.y);
        const zOrientation = Math.sign(deltaDirExposure);
        const maxI = Math.min(
          256,
          Math.abs(greatestDeltaToCheckInDirOfExposure)
        );
        for (let i: number = 0; i <= maxI; i++) {
          const zOffsetToCheck = zOrientation * i + 1;
          const offsetToCheck1 = new Vec3(0, yOffsetInDirOfBot, zOffsetToCheck);
          const offsetToCheck2 = new Vec3(xOffsetInDirOfBot, 0, zOffsetToCheck);
          const coordsToCheck1 = coords.clone().plus(offsetToCheck1);
          const coordsToCheck2 = coords.clone().plus(offsetToCheck2);
          const blockAtOffset1 = bot.blockAt(coordsToCheck1);
          const blockAtOffset2 = bot.blockAt(coordsToCheck2);
          if (!blockAtOffset1 || blockAtOffset1.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
          if (!blockAtOffset2 || blockAtOffset2.boundingBox !== "block") {
            // It's fully or partially see-through, we might be able to see the coords through it
            // TODO: Try raycasting through it & return true if hit surpasses threshold of coords
          }
        }
      }
    }
  }
  return false;
}

// /**
//  * Checks if the 1x1 space at the specified coordinates is visible by the bot,
//  * regardless of whether it contains air or a solid block.
//  * @param bot - The Mineflayer bot instance
//  * @param coords - The coordinates to check visibility for
//  * @returns boolean indicating if the coordinates are visible
//  */
// export function areCoordsVisible(bot: Bot, coords: Vec3): boolean {
//   if (areCoordsVisible(bot, coords)) {
//     return false;
//   }

//   // Get the bot's eye position
//   const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);

//   // Create a vector pointing to the center of the target block
//   const targetPosition = coords.clone().offset(0.5, 0.5, 0.5);

//   // Calculate the direction vector from eye to target
//   const direction = targetPosition.minus(eyePosition);

//   // Get the distance to the target
//   const targetDistance = direction.norm();

//   // Normalize the direction vector
//   direction.normalize();

//   // Use the bot's world.raycast method to check for obstructions
//   const raycastResult = bot.world.raycast(
//     eyePosition,
//     direction,
//     targetDistance + 1 // Look slightly beyond to ensure we catch the target block
//     // // Only consider solid blocks as blockers
//     // (block) => block && block.boundingBox === "block"
//   );

//   // If there's no raycast result, it means there are no obstructions
//   // all the way to (and beyond) our target position
//   if (!raycastResult) {
//     return true;
//   }

//   // Calculate the distance to the edge of the target block that's closest to the bot
//   // First, determine which face of the block would be encountered first
//   // This is a simplified AABB intersection calculation
//   const blockMin = coords.clone(); // Minimum corner of the block
//   const blockMax = coords.clone().offset(1, 1, 1); // Maximum corner of the block

//   // Calculate distances to each of the 6 faces of the block
//   // We only care about the closest face (the one the ray would hit first)
//   let minDistanceToBlock = Number.POSITIVE_INFINITY;

//   // Check x-axis faces
//   if (direction.x !== 0) {
//     const t1 = (blockMin.x - eyePosition.x) / direction.x;
//     const t2 = (blockMax.x - eyePosition.x) / direction.x;
//     const tMin = Math.min(t1, t2);
//     if (tMin >= 0 && tMin < minDistanceToBlock) {
//       minDistanceToBlock = tMin;
//     }
//   }

//   // Check y-axis faces
//   if (direction.y !== 0) {
//     const t1 = (blockMin.y - eyePosition.y) / direction.y;
//     const t2 = (blockMax.y - eyePosition.y) / direction.y;
//     const tMin = Math.min(t1, t2);
//     if (tMin >= 0 && tMin < minDistanceToBlock) {
//       minDistanceToBlock = tMin;
//     }
//   }

//   // Check z-axis faces
//   if (direction.z !== 0) {
//     const t1 = (blockMin.z - eyePosition.z) / direction.z;
//     const t2 = (blockMax.z - eyePosition.z) / direction.z;
//     const tMin = Math.min(t1, t2);
//     if (tMin >= 0 && tMin < minDistanceToBlock) {
//       minDistanceToBlock = tMin;
//     }
//   }

//   // Calculate distance to the ray hit position
//   const hitDistance = eyePosition.distanceTo(raycastResult.position);

//   // The block is visible if there are no obstructions before reaching it
//   // Add a small epsilon for floating point precision
//   return hitDistance >= minDistanceToBlock - 0.001;
// }

// export function isBotOccupyingCoords(bot: Bot, coords: Vec3): boolean {
//   // Get the bot's actual position (which can be fractional)
//   const botPos = bot.entity.position;

//   // Get bot's hitbox dimensions (typically ~0.6 width and ~1.8 height for players)
//   const width = bot.entity.width || 0.6;
//   const height = bot.entity.height || 1.8;

//   // Calculate the bot's bounding box
//   const halfWidth = width / 2;
//   const botMinX = botPos.x - halfWidth;
//   const botMaxX = botPos.x + halfWidth;
//   const botMinZ = botPos.z - halfWidth;
//   const botMaxZ = botPos.z + halfWidth;
//   const botMinY = botPos.y;
//   const botMaxY = botPos.y + height;

//   // Check if the given integer coordinates overlap with any part of the bot's bounding box
//   return (
//     coords.x >= Math.floor(botMinX) &&
//     coords.x <= Math.floor(botMaxX) &&
//     coords.z >= Math.floor(botMinZ) &&
//     coords.z <= Math.floor(botMaxZ) &&
//     coords.y >= Math.floor(botMinY) &&
//     coords.y <= Math.floor(botMaxY)
//   );
// }

export function getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(
  bot: Bot,
  coords: Vec3
): [PBlock, Vec3] | undefined {
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

  // Coords are not placeable if occupied by the botf
  if (isBotOccupyingCoords(bot, coords)) {
    return;
  }

  const adjacentOffsets = [
    new Vec3(0, -1, 0), // Below
    new Vec3(0, 1, 0), // Above
    new Vec3(-1, 0, 0), // West
    new Vec3(1, 0, 0), // East
    new Vec3(0, 0, -1), // North
    new Vec3(0, 0, 1), // South
  ];
  const eyePosition = bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);

  for (const offset of adjacentOffsets) {
    const adjacentPos = coords.clone().add(offset);
    const adjacentBlock = bot.blockAt(adjacentPos);

    // Skip if the adjacent block doesn't exist or is air
    if (adjacentBlock == null || adjacentBlock.type == 0) {
      continue;
    }

    // Skip if not visible
    if (!isBlockRaycastVisible(bot, adjacentBlock, adjacentPos)) {
      continue;
    }

    // Skip if out of reach
    const distanceToReferenceBlock = eyePosition.distanceTo(
      adjacentBlock.position.clone().offset(0.5, 0.5, 0.5)
    );
    if (distanceToReferenceBlock > MAX_PLACEMENT_REACH) {
      continue;
    }

    // Use this block as reference with the opposite face vector
    return [adjacentBlock, offset.scaled(-1)];
  }
}

export function getAllPlaceableCoords(bot: Bot): Vec3[] {
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

export function getASetOfPlaceableCoords(bot: Bot): Vec3 | undefined {
  const placeableCoords = getAllPlaceableCoords(bot);
  if (placeableCoords.length > 0) {
    return placeableCoords[0];
  }
  return undefined;
}

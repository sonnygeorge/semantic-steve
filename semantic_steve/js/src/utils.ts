import { Bot } from "mineflayer";
import { Item as PItem } from "prismarine-item";
import { Block as PBlock } from "prismarine-block";
import { Vec3 } from "vec3";
import { AABB } from "@nxg-org/mineflayer-util-plugin";

export function getDurability(bot: Bot, item: PItem): number | undefined {
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

export const BOT_EYE_HEIGHT = 1.62;

export function isBlockVisible(
  bot: Bot,
  block: PBlock,
  blockCoords: Vec3,
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
          s[5] === 1,
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

function getGoodPathfindingTarget(bot: Bot, targetCoords: Vec3): Vec3 | null {
  // Create a set to keep track of checked positions to avoid duplicates
  const checkedPositions = new Set<string>();

  // Queue for breadth-first search
  const queue: { pos: Vec3; distance: number }[] = [
    { pos: targetCoords.clone(), distance: 0 },
  ];

  while (queue.length > 0) {
    const { pos, distance } = queue.shift()!;

    // Generate a string key for the position to check against the set
    const posKey = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(
      pos.z,
    )}`;

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
      new Vec3(1, 0, 0),
      new Vec3(-1, 0, 0),
      new Vec3(0, 1, 0),
      new Vec3(0, -1, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1),
    ];

    for (const offset of offsets) {
      const nextPos = pos.clone().add(offset);
      queue.push({ pos: nextPos, distance: distance + 1 });
    }
  }

  // If no empty block was found within the radius, return null
  return null;
}

export default getGoodPathfindingTarget;

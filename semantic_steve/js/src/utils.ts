import { Bot } from "mineflayer";
import { Item as PItem } from "prismarine-item";
import { Block as PBlock } from "prismarine-block";
import { Vec3 } from "vec3";
import { AABB } from "@nxg-org/mineflayer-util-plugin";

export const asyncSleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export function getDurabilityPercentRemaining(item: PItem): number | undefined {
  if (item.durabilityUsed) {
    return Math.floor((1 - item.durabilityUsed / item.maxDurability) * 100);
  }
}

export function getDurabilityPercentRemainingString(
  item: PItem,
): string | undefined {
  const durability = getDurabilityPercentRemaining(item);
  if (durability !== undefined) {
    return `${durability}%`;
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

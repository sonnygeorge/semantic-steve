import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { Block as PBlock } from "prismarine-block";

export function isBlock(
  block: PBlock | null,
  allowedBoundingBoxes?: string[]
): boolean {
  if (block === null || block.type === 0) {
    return false;
  }

  let isAnAllowedBoundBox = true;
  if (allowedBoundingBoxes) {
    isAnAllowedBoundBox = allowedBoundingBoxes.includes(block.boundingBox);
  }
  return isAnAllowedBoundBox;
}

export function blockExistsAt(
  bot: Bot,
  coords: Vec3,
  allowedBoundingBoxes?: string[]
): boolean {
  const block = bot.blockAt(coords);
  return isBlock(block, allowedBoundingBoxes);
}

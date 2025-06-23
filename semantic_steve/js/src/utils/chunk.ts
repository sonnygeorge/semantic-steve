import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

/**
 * Applies a function to all coordinates in a chunk.
 */
export function applyFuncToCoordsInChunk(
  bot: Bot,
  fn: (vec: Vec3) => void,
  chunkPoint: { x: number; z: number }
): void {
  const chunkX = chunkPoint.x >> 4;
  const chunkZ = chunkPoint.z >> 4;
  const minY = (bot.game as any).minY ?? 0;
  const maxY = (bot.game as any).height ?? 256;
  for (let x = 0; x < 16; x++) {
    for (let z = 0; z < 16; z++) {
      const worldX = (chunkX << 4) + x;
      const worldZ = (chunkZ << 4) + z;
      for (let y = minY; y < maxY; y++) {
        const pos = new Vec3(worldX, y, worldZ);
        fn(pos);
      }
    }
  }
}

export function isChunkAtLeastPartiallyWithinRadius(
  bot: Bot,
  chunkPoint: { x: number; z: number },
  radius: number
): boolean {
  const closestX = Math.max(
    chunkPoint.x,
    Math.min(bot.entity.position.x, chunkPoint.x + 15)
  );
  const closestZ = Math.max(
    chunkPoint.z,
    Math.min(bot.entity.position.z, chunkPoint.z + 15)
  );
  const horizontalDistance = Math.sqrt(
    Math.pow(closestX - bot.entity.position.x, 2) +
      Math.pow(closestZ - bot.entity.position.z, 2)
  );
  return horizontalDistance <= radius;
}

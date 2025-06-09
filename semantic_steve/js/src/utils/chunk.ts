import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

/**
 * Applies a function to all coordinates in a chunk.
 */
export function applyFuncToCoordsInChunk(
  bot: Bot,
  fn: (vec: Vec3) => void,
  chunkPoint: { x: number; z: number },
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

import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

export function getCurrentDimensionYLimits(bot: Bot): {
  minY: number;
  maxY: number;
} {
  if (bot.version < "1.18") return { minY: 0, maxY: 255 };

  const limits = {
    overworld: { minY: -64, maxY: 319 },
    the_nether: { minY: 0, maxY: 127 },
    the_end: { minY: 0, maxY: 255 },
  };

  return limits[bot.game.dimension] || limits.overworld;
}

export function* getAllCoordsWithinRadiusToBot(
  bot: Bot,
  radius: number,
): IterableIterator<Vec3> {
  const { minY: dimensionBottom, maxY: dimensionTop } =
    getCurrentDimensionYLimits(bot);
  const botPos = bot.entity.position.floored();
  const radiusSquared = radius * radius;

  // Iterate through a square and filter by circular bounds
  for (let x = -radius; x <= radius; x++) {
    const xSquared = x * x;

    // Calculate max z for this x to stay within circle
    const maxZ = Math.floor(Math.sqrt(radiusSquared - xSquared));

    for (let z = -maxZ; z <= maxZ; z++) {
      const zSquared = z * z;

      // Calculate Y bounds based on remaining radius
      const remainingRadiusSquared = radiusSquared - xSquared - zSquared;
      const maxYOffset = Math.floor(Math.sqrt(remainingRadiusSquared));

      // Clip to dimension limits
      const minY = Math.max(dimensionBottom, botPos.y - maxYOffset);
      const maxY = Math.min(dimensionTop, botPos.y + maxYOffset);

      for (let y = minY; y <= maxY; y++) {
        yield new Vec3(botPos.x + x, y, botPos.z + z);
      }
    }
  }
}

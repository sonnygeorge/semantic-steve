import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { VicinityName } from "../vicinity/enums";

function doClassify(
  pos: Vec3,
  botPos: Vec3,
  immediateSurroundingsRadius: number,
  distantSurroundingsRadius: number
): VicinityName | undefined {
  const distanceToPos = botPos.distanceTo(pos);
  if (distanceToPos <= immediateSurroundingsRadius) {
    return VicinityName.IMMEDIATE_SURROUNDINGS;
  } else if (distanceToPos > distantSurroundingsRadius) {
    return undefined;
  } else {
    // The position is in the bot's distant surroundings, we must determine in which of
    // the 10 directions it is located.

    // First, check for up/down, i.e., the cylindrical column created by the slicer's
    // circle in the apple-slicer analogy.

    const horizontalDist = Math.sqrt(
      Math.pow(pos.x - botPos.x, 2) + Math.pow(pos.z - botPos.z, 2)
    );
    if (horizontalDist <= immediateSurroundingsRadius) {
      // If the point's horizontal distance to the bot (on the xz plane) is less than the
      // immediate surrounding's radius, it is within this column.

      // Of course, we already know the point is not in the immediate surroundings, so we
      // don't need to re-check that.

      // Now, if the point is above the bot, it is in the up direction, otherwise it is
      // in the down direction.
      return pos.y > botPos.y
        ? VicinityName.DISTANT_SURROUNDINGS_UP
        : VicinityName.DISTANT_SURROUNDINGS_DOWN;
    }

    // Knowing that the point is in the distant surroundings, but not in the up or down
    // vicinities, we can simply determine which of the leftover cardinal-direction
    // vicinities (i.e., which slice of the apple in the apple-slicer analogy)
    // using the point's horizontal angle from the bot (on the xz plane).
    const angle =
      ((Math.atan2(pos.x - botPos.x, botPos.z - pos.z) * 180) / Math.PI + 360) %
      360;
    if (angle < 22.5 || angle >= 337.5)
      return VicinityName.DISTANT_SURROUNDINGS_NORTH;
    if (angle < 67.5) return VicinityName.DISTANT_SURROUNDINGS_NORTHEAST;
    if (angle < 112.5) return VicinityName.DISTANT_SURROUNDINGS_EAST;
    if (angle < 157.5) return VicinityName.DISTANT_SURROUNDINGS_SOUTHEAST;
    if (angle < 202.5) return VicinityName.DISTANT_SURROUNDINGS_SOUTH;
    if (angle < 247.5) return VicinityName.DISTANT_SURROUNDINGS_SOUTHWEST;
    if (angle < 292.5) return VicinityName.DISTANT_SURROUNDINGS_WEST;
    return VicinityName.DISTANT_SURROUNDINGS_NORTHWEST;
  }
}

const cache = new Map<string, VicinityName | undefined>();

export function classifyVicinityOfPosition(
  pos: Vec3,
  bot: Bot,
  immediateSurroundingsRadius: number,
  distantSurroundingsRadius: number
): VicinityName | undefined {
  const flooredPos = new Vec3(
    Math.floor(pos.x),
    Math.floor(pos.y),
    Math.floor(pos.z)
  );
  const flooredBotPos = new Vec3(
    Math.floor(bot.entity.position.x),
    Math.floor(bot.entity.position.y),
    Math.floor(bot.entity.position.z)
  );
  const key = `${flooredPos.x},${flooredPos.y},${flooredPos.z},${flooredBotPos.x},${flooredBotPos.y},${flooredBotPos.z}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const classification = doClassify(
    flooredPos,
    flooredBotPos,
    immediateSurroundingsRadius,
    distantSurroundingsRadius
  );
  cache.set(key, classification);
  return classification;
}

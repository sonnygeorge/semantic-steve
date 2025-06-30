import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName } from "./common";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";

/**
 * Takes a point and calculates which of the 11 "vicinities" it is in relative to the bot's
 * current position (if any).
 *
 * The space in around the bot is divided into 11 "vicinities" as follows:
 *
 * 1. `IMMEDIATE_SURROUNDINGS`:
 *    - Is the space within an immediate sphere of radius `ImmediateSurroundingsRadius`.
 *
 * 2. `DISTANT_SURROUNDINGS_UP` and `DISTANT_SURROUNDINGS_DOWN`:
 *    - Are cylindrical columns extending up and down from the circumference of the
 *     IMMEDIATE_SURROUNDINGS sphere, but not extending beyond `DistantSurroundingsRadius`.
 *
 * 3. `DISTANT_SURROUNDINGS_{NORTH, NORTHEAST, EAST, SOUTHEAST, SOUTH, SOUTHWEST, WEST, NORTHWEST}`:
 *    - Partition the remaining space in a sphere of radius `DistantSurroundingsRadius` into
 *      8 "wedges".
 *
 *      (Hint: picture an apple sliced by that one apple slicer kitchen tool that gets
 *      pressed down onto an apple and creates apple wedges while remove a center column
 *      containing the apple core.)
 *
 *
 * Horizontal slice (i.e. "viewed from above") at current bot y-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO    \       N       /    OOo
 *            oOO        \             /        OOo
 *          oOO           \           /           OOo
 *        oOO     NW       \         /     NE       OOo
 *       oOO.               \       /               .OOo
 *      oOO  '--.__         ooooooooo         __.--'  OOo
 *     oOO         ''__   oo         oo   __''         OOo
 *     oOO             'oo             oo'             OOo
 *     oOO   W          o   IMMEDIATE   o         E    OOo
 *     oOO           __.oo             oo.__           OOo
 *     oOO    __.--''     oo         oo     ''--.__    OOo
 *      oOO -'              ooooooooo              '- OOo
 *       oOO                /       \                OOo
 *        oOO     SW       /         \       SE     OOo
 *          oOO           /           \            OOo
 *            oO         /             \         OOo
 *               oOO    /       S       \     OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 *
 *  Horizontal slice (i.e. "viewed from the side") at current bot x-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO   |                 |   OOo
 *            oOO      |       UP        |      OOo
 *          oOO        |                 |        OOo
 *        oOO          |                 |          OOo
 *       oOO           |                 |           OOo
 *      oOO            |    ooooooooo    |            OOo
 *     oOO             |  oo         oo  |             OOo
 *     oOO              oo             oo              OOo
 *     oOO   S          o   IMMEDIATE   o         N    OOo
 *     oOO              oo             oo              OOo
 *     oOO             |  oo         oo  |             OOo
 *      oOO            |    ooooooooo    |            OOo
 *       oOO           |                 |           OOo
 *        oOO          |                 |          OOo
 *          oOO        |                 |         OOo
 *            oO       |      DOWN       |       OOo
 *               oOO   |                 |    OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 *
 */
export function classifyVicinityOfPosition(
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

export function getVicinityMasks(
  bot: Bot,
  radii: SurroundingsRadii
): Map<VicinityName, VoxelSpaceAroundBotEyes<boolean>> {
  const vicinityMasks: Map<
    VicinityName,
    VoxelSpaceAroundBotEyes<boolean>
  > = new Map();
  for (const vicinityName of Object.values(VicinityName)) {
    vicinityMasks.set(
      vicinityName,
      new VoxelSpaceAroundBotEyes<boolean>(
        bot,
        radii.distantSurroundingsRadius,
        false // Default value for the mask
      )
    );
  }

  const origin = new Vec3(0, 0, 0);
  for (const offset of vicinityMasks
    .get(VicinityName.IMMEDIATE_SURROUNDINGS)!
    .iterAllOffsets()) {
    const vicinityNameOfOffset = classifyVicinityOfPosition(
      offset,
      origin,
      radii.immediateSurroundingsRadius,
      radii.distantSurroundingsRadius
    );
    if (vicinityNameOfOffset) {
      // If the vicinity is defined, set the respective mask to true for this offset
      vicinityMasks.get(vicinityNameOfOffset)!.setFromOffset(offset, true);
    }
  }
  return vicinityMasks;
}

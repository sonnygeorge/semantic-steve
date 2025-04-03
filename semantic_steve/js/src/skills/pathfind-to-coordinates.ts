import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SkillReturn } from "../types";
import { _pathfindToCoordinates } from "./_pathfind-to-coordinates";
import { Thing } from "../core/thing/protocol";
import { pathfindToCoordinatesResultsMessages } from "../results-messages";
import { SUPPORTED_THING_TYPES } from "../core/thing";

export async function pathfindToCoordinates(
  bot: Bot,
  coords: number[],
  stopIfFound: string[],
): Promise<SkillReturn> {
  const vec3Coords = new Vec3(coords[0], coords[1], coords[2]);
  const stopIfFoundThings: Thing[] = [];

  for (const thingName of stopIfFound) {
    const thing = bot.thingFactory.createThing(thingName);
    if (!thing) {
      return {
        resultString: pathfindToCoordinatesResultsMessages.ERROR_INVALID_THING(
          thingName,
          SUPPORTED_THING_TYPES,
        ),
        envStateIsHydrated: false,
      };
    }
    stopIfFoundThings.push(thing);
  }
  return await _pathfindToCoordinates(bot, vec3Coords, stopIfFoundThings);
}

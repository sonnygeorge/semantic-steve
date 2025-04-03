import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SkillReturn } from "../types";
import { Pathfinder } from "./_pathfind-to-coordinates";
import { Thing } from "../core/thing/protocol";
import { pathfindToCoordinatesResultsMessages } from "../results-messages";
import { SUPPORTED_THING_TYPES } from "../core/thing";

export async function pathfindToCoordinates(
  bot: Bot,
  coords: number[],
  stopIfFound: string[]
): Promise<SkillReturn> {
  // Pre-process coords argument
  if (!Array.isArray(coords) || coords.length !== 3 || coords.some(isNaN)) {
    return {
      resultString: pathfindToCoordinatesResultsMessages.ERROR_INVALID_COORDS(
        coords.toString()
      ),
      envStateIsHydrated: false,
    };
  }
  const vec3Coords = new Vec3(coords[0], coords[1], coords[2]);

  // Pre-process stopIfFound argument
  const stopIfFoundThings: Thing[] = [];
  for (const thingName of stopIfFound) {
    const thing = bot.thingFactory.createThing(thingName);
    if (!thing) {
      return {
        resultString: pathfindToCoordinatesResultsMessages.ERROR_INVALID_THING(
          thingName,
          SUPPORTED_THING_TYPES
        ),
        envStateIsHydrated: false,
      };
    }
    stopIfFoundThings.push(thing);
  }

  const pathfinder = new Pathfinder(bot);
  return await pathfinder.pathfindToCoordinates(vec3Coords, stopIfFoundThings);
}

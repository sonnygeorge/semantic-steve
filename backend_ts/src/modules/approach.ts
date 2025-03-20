import { Bot } from "mineflayer";
import { SemanticSteveFunctionReturnObj, Vicinity } from "../types";
import { pathfindToCoordinates } from "../pathfind";
import { goals } from "mineflayer-pathfinder";

export default async function approach(bot: Bot, thing: string, direction?: string): Promise<SemanticSteveFunctionReturnObj> {
  if (!bot.surroundingsHelper.in_surroundings(thing)) {
    return {
      resultString: `Error: ${thing} not found in vicinity`,
      envStateIsUpToDate: true,
    };
  }
  const dir = direction as Vicinity | undefined;
  const targetThingCoords = bot.surroundingsHelper.get_coords_of_closest_thing(thing, dir);

  if (targetThingCoords === null) {
    return {
      resultString: `Error: ${thing} not found in direction ${direction}`,
      envStateIsUpToDate: true,
    };
  }

  const goal = new goals.GoalNear(targetThingCoords.x, targetThingCoords.y, targetThingCoords.z, 2)

  return await pathfindToCoordinates(bot, goal);
}

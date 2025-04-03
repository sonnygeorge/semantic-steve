import type { Bot } from "mineflayer";
import { SkillReturn } from "../types";

/**
 * Pathfind to the given coordinates.
 * @param coords The coordinates to pathfind to.
 * @param stopIfFound The names of the things to stop at if found.
 */
export async function pathfindToCoordinates(
  bot: Bot,
  coords: number[],
  stopIfFound: string[],
): Promise<SkillReturn> {
  return {
    resultString: null,
    envStateIsUpToDate: false,
  };
}

import { pathfindToCoordinates } from "./skills/pathfind-to-coordinates";
import { Skill } from "./types";
import type { Bot } from "mineflayer";

export function buildSkillsRegistry(bot: Bot): Record<string, Skill> {
  return {
    pathfindToCoordinates: async (
      coordinates: number[],
      stopIfFound: string[]
    ) => {
      return await pathfindToCoordinates(bot, coordinates, stopIfFound);
    },
  };
}

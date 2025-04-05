import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";
import { PathfindToCoordinates } from "./pathfind-to-coordinates";

export { Skill, SkillMetadata, SkillResolutionHandler };

export function buildSkillsRegistry(
  bot: Bot,
  onResolution: SkillResolutionHandler
): Record<string, Skill> {
  return {
    [PathfindToCoordinates.metadata.name]: new PathfindToCoordinates(
      bot,
      onResolution
    ),
  };
}

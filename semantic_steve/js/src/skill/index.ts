import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";
import { PathfindToCoordinates } from "./pathfind-to-coordinates";
import{ TakeScreenshotOf } from './take-screenshot-of'

export { Skill, SkillMetadata, SkillResolutionHandler };

export function buildSkillsRegistry(
  bot: Bot,
  onResolution: SkillResolutionHandler
): { [key: string]: Skill } {
  return {
    [PathfindToCoordinates.metadata.name]: new PathfindToCoordinates(
      bot,
      onResolution
    ),
    [TakeScreenshotOf.metadata.name]: new TakeScreenshotOf(
      bot,
      onResolution
    ),
  };
}

import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";
import { PathfindToCoordinates } from "./pathfind-to-coordinates/pathfind-to-coordinates";
import { CraftItems } from "./craft-items/craft-items";
import { MineBlocks } from "./mine-blocks/mine-blocks";
import { PlaceBlock } from "./place-block/place-block";
import { SmeltItems } from "./smelt-items/smelt-items";
import { TakeScreenshotOf } from "./take-screenshot-of/take-screenshot-of";

export { Skill, SkillMetadata, SkillResolutionHandler };

export function buildSkillsRegistry(
  bot: Bot,
  onResolution: SkillResolutionHandler,
): { [key: string]: Skill } {
  return {
    [PathfindToCoordinates.metadata.name]: new PathfindToCoordinates(
      bot,
      onResolution,
    ),
    [TakeScreenshotOf.metadata.name]: new TakeScreenshotOf(bot, onResolution),
    [CraftItems.metadata.name]: new CraftItems(bot, onResolution),
    [MineBlocks.metadata.name]: new MineBlocks(bot, onResolution),
    [PlaceBlock.metadata.name]: new PlaceBlock(bot, onResolution),
    [SmeltItems.metadata.name]: new SmeltItems(bot, onResolution),
  };
}

import { Bot } from "mineflayer";
import {
  Skill,
  SkillMetadata,
  SkillResolutionHandler,
  SkillStatus,
} from "./skill";
import { PathfindToCoordinates } from "./pathfind-to-coordinates/pathfind-to-coordinates";
import { CraftItems } from "./craft-items/craft-items";
import { MineBlocks } from "./mine-blocks/mine-blocks";
import { PlaceBlock } from "./place-block/place-block";
import { SmeltItems } from "./smelt-items/smelt-items";
import { TakeScreenshotOf } from "./take-screenshot-of/take-screenshot-of";
import { Approach } from "./approach/approach";
import { PickupItem } from "./pickup-item/pickup-item";
import { GetPlaceableCoordinates } from "./get-placeable-coordinates/get-placeable-coordinates";
import { GenericSkillResults } from "./generic-results";

export {
  Skill,
  SkillMetadata,
  SkillStatus,
  SkillResolutionHandler,
  GenericSkillResults,
};

export function buildSkillsRegistry(
  bot: Bot,
  onResolution: SkillResolutionHandler,
): { [key: string]: Skill } {
  return {
    [PathfindToCoordinates.METADATA.name]: new PathfindToCoordinates(
      bot,
      onResolution,
    ),
    [TakeScreenshotOf.METADATA.name]: new TakeScreenshotOf(bot, onResolution),
    [CraftItems.METADATA.name]: new CraftItems(bot, onResolution),
    [MineBlocks.METADATA.name]: new MineBlocks(bot, onResolution),
    [PlaceBlock.METADATA.name]: new PlaceBlock(bot, onResolution),
    [SmeltItems.METADATA.name]: new SmeltItems(bot, onResolution),
    [Approach.METADATA.name]: new Approach(bot, onResolution),
    [PickupItem.METADATA.name]: new PickupItem(bot, onResolution),
    [GetPlaceableCoordinates.METADATA.name]: new GetPlaceableCoordinates(
      bot,
      onResolution,
    ),
  };
}

import { Bot } from "mineflayer";
import { Item as PItem } from "prismarine-item";

export function getDurability(bot: Bot, item: PItem): number | undefined {
  // For newer Mineflayer versions that use the `durabilityUsed` property
  if (item.durabilityUsed) {
    return item.durabilityUsed;
  }

  // For older Mineflayer versions that use metadata directly
  if (bot.registry.supportFeature("nbtOnMetadata")) {
    if (item.metadata !== undefined) {
      return item.metadata;
    }
  }
}

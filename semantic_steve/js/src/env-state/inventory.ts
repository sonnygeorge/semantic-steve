import { Bot } from "mineflayer";
import type { Item as PItem } from "prismarine-item";
import { getDurabilityRemainingString } from "../utils/durability";

/**
 * "Data Transfer Object" (DTO) for an inventory slot item containing the information that
 * we want to send to the Python client in the format we want the user (LLM) to see it.
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type InventoryItemDTO = {
  name: string;
  count: number;
  durabilityRemaining?: string; // e.g. "50%"
};

/**
 * Inventory class that wraps the bot's inventory and provides additional functionality
 * for managing and querying the inventory.
 */
export class Inventory {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Only the slots with items.
   *
   * (wrapper around the this.bot.inventory.slots to filter out null values)
   */
  public get itemSlots(): PItem[] {
    return this.bot.inventory.slots.filter(
      (item): item is PItem => item !== null
    );
  }

  /**
   * Map of item names to their corresponding PItem objects.
   */
  public get itemsToSlots(): Map<string, PItem> {
    return new Map(this.itemSlots.map((item) => [item.name, item]));
  }

  /**
   * Map of item names to their total counts in the inventory.
   */
  public get itemsToTotalCounts(): Map<string, number> {
    const itemTotals = new Map<string, number>();
    this.itemSlots.map((item) => {
      const currentCount = itemTotals.get(item.name) || 0;
      itemTotals.set(item.name, currentCount + item.count);
    });
    return itemTotals;
  }

  /**
   * Returns an array of `InventoryItemDTO` objects.
   */
  public getDTO(): InventoryItemDTO[] {
    return this.itemSlots.map((item) => ({
      name: item.name,
      count: item.count,
      durabilityRemaining: getDurabilityRemainingString(item),
    }));
  }
}

import assert from "assert";
import { Bot } from "mineflayer";

export interface InventoryItemDifferential {
  metadata?: any;
  durabilityUsed?: number;
  curDurability?: number;
  countDifferential?: number;
}

export interface InventoryChanges {
  [id: number]: InventoryItemDifferential;
}

/**
 * "Data Transfer Object" (DTO) version of `InventoryChanges` containing the
 * information that we want to send to the Python client in the format we want the user
 * (LLM) to see it.
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export interface InventoryChangesDTO {
  itemsAcquired: { [key: string]: number };
  itemsLostOrConsumed: { [key: string]: number };
  changedDurabilities: string[];
}

export function getInventoryChangesDTO(
  bot: Bot,
  inventoryDifferential: InventoryChanges,
): InventoryChangesDTO {
  let itemsAcquired: { [key: string]: number } = {};
  let itemsLostOrConsumed: { [key: string]: number } = {};
  let durabilityChanges: string[] = [];

  for (const id in inventoryDifferential) {
    const itemDiff = inventoryDifferential[id];
    const itemName = bot.registry.items[id].name;

    if (itemDiff.countDifferential !== undefined) {
      assert(
        itemDiff.countDifferential !== 0,
        "We should never save a differential of 0, should be undefined instead",
      );
      if (itemDiff.countDifferential > 0) {
        itemsAcquired[itemName] = itemDiff.countDifferential;
      } else {
        console.log(itemDiff.countDifferential);
        itemsLostOrConsumed[itemName] = -itemDiff.countDifferential;
      }
    }

    if (itemDiff.durabilityUsed !== undefined) {
      assert(
        itemDiff.curDurability !== undefined,
        "This shouldn't be undefined if we have durabilityUsed",
      );
      durabilityChanges.push(
        `${itemName} lost ${itemDiff.durabilityUsed} durability and is now at ${itemDiff.curDurability} durability.`,
      );
    }
  }

  return {
    itemsAcquired: itemsAcquired,
    itemsLostOrConsumed: itemsLostOrConsumed,
    changedDurabilities: durabilityChanges,
  };
}

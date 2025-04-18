import assert from "assert";
import { Bot } from "mineflayer";

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
}

export function getInventoryChangesDTO(
  bot: Bot,
  inventoryDifferential: Map<string, number>,
): InventoryChangesDTO {
  let itemsAcquired: { [key: string]: number } = {};
  let itemsLostOrConsumed: { [key: string]: number } = {};

  // Iterate through Map entries instead of using for...in
  for (const [itemName, countDifferential] of inventoryDifferential.entries()) {
    assert(
      countDifferential !== 0,
      "We should never save a differential of 0, should be undefined instead",
    );

    if (countDifferential > 0) {
      itemsAcquired[itemName] = countDifferential;
    } else {
      console.log(countDifferential);
      itemsLostOrConsumed[itemName] = -countDifferential;
    }
  }

  return {
    itemsAcquired: itemsAcquired,
    itemsLostOrConsumed: itemsLostOrConsumed,
  };
}

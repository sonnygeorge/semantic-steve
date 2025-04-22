import assert from "assert";
import { Bot } from "mineflayer";
import { InventoryChangesDTO } from "../types";

export function getInventoryChangesDTO(
  bot: Bot,
  inventoryDifferential: Map<string, number>,
): InventoryChangesDTO {
  let itemsAcquired: { [key: string]: number } = {};
  let itemsLostOrConsumed: { [key: string]: number } = {};
  for (const [itemName, countDifferential] of inventoryDifferential.entries()) {
    assert(
      countDifferential !== 0,
      "We should never save a differential of 0, should be undefined instead",
    );

    if (countDifferential > 0) {
      itemsAcquired[itemName] = countDifferential;
    } else {
      itemsLostOrConsumed[itemName] = -countDifferential;
    }
  }

  return {
    itemsAcquired: itemsAcquired,
    itemsLostOrConsumed: itemsLostOrConsumed,
  };
}

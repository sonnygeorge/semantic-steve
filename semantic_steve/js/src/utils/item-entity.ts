import assert from "assert";
import { Bot } from "mineflayer";
import { Entity as PEntity } from "prismarine-entity";
import { ItemEntityWithData } from "../types";

export async function ensureItemEntityHasUUID(
  bot: Bot,
  itemEntity: PEntity,
): Promise<PEntity> {
  assert(itemEntity.name === "item");
  // If no UUID, listen for entityUpdate on the entity until it has one.
  if (!itemEntity.uuid) {
    await new Promise<void>((res, rej) => {
      const listener = (e: PEntity) => {
        if (e.id === itemEntity.id && e.uuid) {
          res();
          bot.off("entityUpdate", listener);
        }
      };
      bot.on("entityUpdate", listener);
      setTimeout(() => {
        rej(new Error("Timeout waiting for entity uuid."));
        bot.off("entityUpdate", listener);
      }, 5000);
    });
  }
  assert(itemEntity.uuid);
  return itemEntity;
}

export async function ensureItemData(
  bot: Bot,
  itemEntity: PEntity,
): Promise<ItemEntityWithData> {
  assert(itemEntity.name === "item");
  itemEntity = await ensureItemEntityHasUUID(bot, itemEntity);
  // Now we can safely get the item data (PItem).
  const pItem = itemEntity.getDroppedItem();
  assert(pItem);
  return {
    entity: itemEntity,
    itemData: pItem,
  };
}

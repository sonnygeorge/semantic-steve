import { Bot } from "mineflayer";
import { ThingType } from "../thing-type";
import { Vec3 } from "vec3";
import { DirectionName } from "../../types";
import { InvalidThingError } from "../../types";

export class ItemType implements ThingType {
  bot: Bot;
  name: string; // "dirt", "diamond_pickaxe", etc.
  id: number; // 1, 2, etc. (item id)

  constructor(bot: Bot, name?: string, id?: number) {
    if (name) {
      const itemEntityNames = Object.values(bot.registry.itemsByName).map(
        (i) => i.name,
      );
      if (!itemEntityNames.includes(name)) {
        throw new InvalidThingError(`Invalid item entity type: ${name}.`);
      }
      this.name = name;
      this.id = bot.registry.itemsByName[name].id;
    } else if (id) {
      const itemEntityIds = Object.values(bot.registry.items).map((i) => i.id);
      if (!itemEntityIds.includes(id)) {
        throw new InvalidThingError(`Invalid item entity id: ${id}.`);
      }
      this.id = id;
      this.name = bot.registry.items[id].name;
    } else {
      throw new Error(
        "Either name or id must be provided to create an ItemEntity.",
      );
    }
    this.bot = bot;
  }

  // ======================
  // Item-specific methods
  // ======================

  getTotalCountInInventory(): number {
    return this.bot.envState.inventory.itemsToTotalCounts.get(this.name) || 0;
  }

  // ================================
  // Implementation of ThingType API
  // ================================

  async isVisibleInImmediateSurroundings(): Promise<boolean> {
    for await (const itemName of this.bot.envState.surroundings.immediate.visible.getDistinctItemNames()) {
      if (itemName === this.name) {
        return true;
      }
    }
    return false;
  }

  async isVisibleInDistantSurroundings(): Promise<boolean> {
    for (const dir of this.bot.envState.surroundings.distant.values()) {
      for await (const itemName of dir.visible.getDistinctItemNames()) {
        if (itemName === this.name) {
          return true;
        }
      }
    }
    return false;
  }

  async locateNearest(): Promise<Vec3 | undefined> {
    // Try immediate surroundings first
    const immediateResult = await this.locateNearestInImmediateSurroundings();
    if (immediateResult) {
      return immediateResult;
    }

    // If not found in immediate surroundings, try distant surroundings
    return await this.locateNearestInDistantSurroundings();
  }

  async locateNearestInImmediateSurroundings(): Promise<Vec3 | undefined> {
    const itemNamesToClosestCoords =
      await this.bot.envState.surroundings.immediate.visible.getItemNamesToClosestCoords();
    for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
      if (name === this.name) {
        return closestCoords.clone();
      }
    }
  }

  async locateNearestInDistantSurroundings(
    direction?: DirectionName,
  ): Promise<Vec3 | undefined> {
    // If a specific direction is provided, check only that direction
    if (direction) {
      const vicinity = this.bot.envState.surroundings.distant.get(direction)!;
      const itemNamesToClosestCoords =
        await vicinity.visible.getItemNamesToClosestCoords();
      for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
        if (name === this.name) {
          return closestCoords.clone();
        }
      }
      return undefined; // Not found in the specified direction
    }

    // If no direction specified, find the closest coordinates across all directions
    let closestOfClosestCoords: Vec3 | undefined = undefined;
    let smallestDistance = Infinity;
    for (const vicinity of this.bot.envState.surroundings.distant.values()) {
      const itemNamesToClosestCoords =
        await vicinity.visible.getItemNamesToClosestCoords();
      for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
        if (name === this.name) {
          const distance = this.bot.entity.position.distanceTo(closestCoords);
          if (distance < smallestDistance) {
            smallestDistance = distance;
            closestOfClosestCoords = closestCoords.clone();
          }
          break;
        }
      }
    }
    return closestOfClosestCoords;
  }

  async isVisibleInImmediateSurroundingsAt(coords: Vec3): Promise<boolean> {
    const itemNamesToAllCoords =
      await this.bot.envState.surroundings.immediate.visible.getItemNamesToAllCoords();
    for (const [name, coordsIterable] of itemNamesToAllCoords.entries()) {
      if (name === this.name) {
        for (const itemCoords of coordsIterable) {
          if (itemCoords.equals(coords)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

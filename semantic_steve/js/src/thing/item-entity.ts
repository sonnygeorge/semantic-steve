import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction } from "../env-state/surroundings";
import { MaybePromise, InvalidThingError } from "../types";

/**
 * An item type that is "dropped", is hovering on the ground, and can be picked up.
 */
export class ItemEntity implements Thing {
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

  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.has(
      this.name,
    );
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.itemEntitiesToCounts.has(this.name),
    );
  }

  locateNearest(): MaybePromise<Vec3 | undefined> {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult) {
      return immediateResult;
    }

    // If not found in immediate surroundings, try distant surroundings
    return this.locateNearestInDistantSurroundings();
  }

  locateNearestInImmediateSurroundings(): MaybePromise<Vec3 | undefined> {
    const immediate =
      this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.get(
        this.name,
      );
    if (immediate && immediate.length > 0) {
      // Sort the coordinates by distance to the bot's position
      immediate.sort((a, b) => {
        const distanceA = a.distanceTo(this.bot.entity.position);
        const distanceB = b.distanceTo(this.bot.entity.position);
        return distanceA - distanceB;
      });
      // Return the closest coordinate
      return immediate[0];
    }
  }

  locateNearestInDistantSurroundings(
    direction?: Direction,
  ): MaybePromise<Vec3 | undefined> {
    // If a specific direction is provided, check only that direction
    if (direction) {
      const surroundingsInDirection =
        this.bot.envState.surroundings.distant.get(direction);
      if (surroundingsInDirection) {
        const count = surroundingsInDirection.itemEntitiesToCounts.get(
          this.name,
        );
        if (count && count > 0) {
          return surroundingsInDirection.itemEntitiesToClosestCoords.get(
            this.name,
          );
        }
      }
      return undefined; // No item entities found in the specified direction
    }

    // If no direction specified, check all directions
    const directions = Array.from(
      this.bot.envState.surroundings.distant.keys(),
    );

    // Find the closest coordinates across all directions
    let closestCoords: Vec3 | undefined = undefined;
    let minDistance = Infinity;
    for (const dir of directions) {
      const surroundingsInDir = this.bot.envState.surroundings.distant.get(dir);
      if (surroundingsInDir) {
        const count = surroundingsInDir.itemEntitiesToCounts.get(this.name);
        if (count && count > 0) {
          const coords = surroundingsInDir.itemEntitiesToClosestCoords.get(
            this.name,
          );
          if (coords) {
            const distance = coords.distanceTo(this.bot.entity.position);
            if (distance < minDistance) {
              minDistance = distance;
              closestCoords = coords.clone();
            }
          }
        }
      }
    }

    return closestCoords;
  }

  getTotalCountInInventory(): number {
    // ASSUMPTION: While ItemEntity represents to a type of dropped/floating item entity,
    // its name should(?) correspond the item as it would be if picked up and in inventory.
    return this.bot.envState.inventory.itemsToTotalCounts.get(this.name) || 0;
  }
}

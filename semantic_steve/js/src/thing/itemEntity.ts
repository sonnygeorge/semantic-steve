import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction, Vicinity } from "../env-state/surroundings";
import { MaybePromise } from "../types";

/**
 * An item type that is "dropped", is hovering on the ground, and can be picked up.
 */
export class ItemEntity implements Thing {
  bot: Bot;
  name: string; // "dirt", "diamond_pickaxe", etc.

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
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

  // Main locateNearest method that follows the interface pattern
  locateNearest(): MaybePromise<Vec3> {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult !== null) {
      return immediateResult;
    }
    
    // If not found in immediate surroundings, try distant surroundings
    return this.locateNearestInDistantSurroundings();
  }

  // Method to locate in immediate surroundings
  locateNearestInImmediateSurroundings(): MaybePromise<Vec3> {
    const immediate = 
      this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.get(this.name);
    if (immediate != null && immediate.length > 0) {
      return immediate[0];
    }
    return null;
  }

  // Method to locate in distant surroundings with optional direction
  locateNearestInDistantSurroundings(direction?: Vicinity): MaybePromise<Vec3> {
    // If a specific direction is provided, check only that direction
    if (direction && direction !== "immediate") {
      const distant = this.bot.envState.surroundings.distant.get(
        direction as unknown as Direction,
      );
      if (distant != null) {
        const count = distant.itemEntitiesToCounts.get(this.name);
        if (count != null && count > 0) {
          return distant.itemEntitiesToClosestCoords.get(this.name) ?? null;
        }
      }
      return null;
    }

    // If no direction specified, check all directions
    const directions = Array.from(
      this.bot.envState.surroundings.distant.keys(),
    );

    // Find the closest coordinates across all directions
    let closestCoords: Vec3 | null = null;
    let minDistance = Infinity;

    for (const dir of directions) {
      const distant = this.bot.envState.surroundings.distant.get(dir);
      if (distant != null) {
        const count = distant.itemEntitiesToCounts.get(this.name);
        if (count != null && count > 0) {
          const coords = distant.itemEntitiesToClosestCoords.get(this.name);
          if (coords != null) {
            // Calculate distance to these coordinates
            const distance = coords.distanceTo(this.bot.entity.position);

            // Update closest if this is closer than what we've found so far
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
}
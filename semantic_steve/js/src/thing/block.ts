import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction, Vicinity } from "../env-state/surroundings";

export class Block implements Thing {
  bot: Bot;
  name: string;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
  }


  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(
      this.name
    );
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.blocksToCounts.has(this.name)
    );
  }

  locateNearest(direction?: Vicinity): Vec3 | null {
    // Check immediate surroundings first (regardless of direction parameter)
    const immediate = this.bot.envState.surroundings.immediate.blocksToAllCoords.get(this.name);
    if (immediate != null && immediate.length > 0) {
      return immediate[0];
    }
    
    // If direction is explicitly set to "immediate", we've already checked and didn't find it
    if (direction === "immediate") {
      return null;
    }
    
    // If a specific direction is provided (and it's not "immediate"), check only that direction
    if (direction) {
      const distant = this.bot.envState.surroundings.distant.get(direction as unknown as Direction);
      if (distant != null) {
        const count = distant.blocksToCounts.get(this.name);
        if (count != null && count > 0) {
          return distant.blocksToClosestCoords.get(this.name) ?? null;
        }
      }
      return null;
    }
    
    // If no direction specified, check all directions
    // Get all directions from the surroundings map
    const directions = Array.from(this.bot.envState.surroundings.distant.keys());
    
    // Find the closest coordinates across all directions
    let closestCoords: Vec3 | null = null;
    let minDistance = Infinity;
    
    for (const dir of directions) {
      const distant = this.bot.envState.surroundings.distant.get(dir);
      if (distant != null) {
        const count = distant.blocksToCounts.get(this.name);
        if (count != null && count > 0) {
          const coords = distant.blocksToClosestCoords.get(this.name);
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

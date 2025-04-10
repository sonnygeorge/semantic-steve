import assert from "assert";
import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction, Vicinity } from "../env-state/surroundings";

export class Biome implements Thing {
  bot: Bot;
  name: string;
  id: number;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
    this.id = -1;
    for (const [id, biome] of Object.entries(this.bot.registry.biomes)) {
      if (biome.name === this.name) {
        this.id = parseInt(id);
      }
    }
    assert(
      this.id !== -1,
      `This should be impossible if this object is being created by the factory`,
    );
  }

  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.biomes.has(this.id);
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.biomesToClosestCoords.has(this.id),
    );
  }

  locateNearest(direction?: Vicinity): Vec3 | null {
    const id = this.bot.registry.biomesByName[this.name]?.id;
    
    // Check immediate surroundings first (regardless of direction parameter)
    if (!id) {
      return null;
    }
    
    // If in immediate surroundings, return current position
    if (this.bot.envState.surroundings.immediate.biomes.has(id)) {
      return this.bot.entity.position.clone(); // assume we are in it
    }
    
    // If direction is explicitly set to "immediate", we've already checked and didn't find it
    if (direction === "immediate") {
      return null;
    }
    
    // If a specific direction is provided (and it's not "immediate"), check only that direction
    if (direction) {
      const distant = this.bot.envState.surroundings.distant.get(direction as unknown as Direction);
      if (distant != null) {
        const coords = distant.biomesToClosestCoords.get(id);
        if (coords != null) {
          return coords.clone();
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
        const coords = distant.biomesToClosestCoords.get(id);
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
    
    return closestCoords;
  }
}

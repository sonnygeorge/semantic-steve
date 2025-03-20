import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

import { EnvState } from "./envState";
import { Direction, Vicinity } from "./types";

export type ThingType = "block" | "biome" | "player" | "unknown";

export class SurroundingsHelper {
  private bot: Bot;
  private envState: EnvState;

  constructor(bot: Bot) {
    this.bot = bot;
    this.envState = bot.envState;
  }

  /**
   * Determines the type of a thing (block or biome)
   * @param thing The name of the thing to identify
   * @returns The type of the thing (block, biome, or unknown)
   */
  public identifyThingType(thing: string): ThingType {
    // Check if it's a valid block name
    const blockNames = Object.values(this.bot.registry.blocksByName).map((b) => b.name);
    if (blockNames.includes(thing)) {
      return "block";
    }

    // Check if it's a valid biome name
    const biomeNames = Object.values(this.bot.registry.biomes).map((b) => b.name);
    if (biomeNames.includes(thing)) {
      return "biome";
    }

    // Check if it's a player
    const playerNames = Object.keys(this.bot.players);
    if (playerNames.includes(thing)) {
      return "player";
    }

    return "unknown";
  }

  /**
   * Checks if a thing is in the immediate vicinity
   * @param thing The name of the thing to check for
   * @returns True if the thing is in the immediate vicinity
   */
  public isInImmediateVicinity(thing: string): boolean {
    const thingType = this.identifyThingType(thing);
    const immediateSurroundings = this.envState.surroundings.getImmediateSurroundings();

    if (!immediateSurroundings) return false;

    switch (thingType) {
      case "block":
        return immediateSurroundings.blocks?.has(thing) || false;
      case "biome":
        // Find biome ID from name
        const biomeId = this.getBiomeIdFromName(thing);
        if (biomeId === -1) return false;
        return immediateSurroundings.biomes?.has(biomeId) || false;
      case "player":
        return this.bot.players[thing]?.entity !== undefined || false;
      default:
        return false;
    }
  }

  /**
   * Checks if a thing is in a specific direction of distant surroundings
   * @param thing The name of the thing to check for
   * @param direction The direction to check in
   * @returns True if the thing is in the specified direction
   */
  public isInDistantDirection(thing: string, direction: Direction): boolean {
    const thingType = this.identifyThingType(thing);
    const distantSurroundings = this.envState.surroundings.getDistantSurroundings();

    if (!distantSurroundings) return false;
    const directionData = distantSurroundings.get(direction);
    if (!directionData) return false;

    switch (thingType) {
      case "block":
        return directionData.blocksToCounts?.has(thing) || false;
      case "biome":
        // Find biome ID from name
        const biomeId = this.getBiomeIdFromName(thing);
        if (biomeId === -1) return false;

        return directionData.biomesToClosestCoords?.has(biomeId) || false;
      case "player":
        console.log(directionData.players);
        return directionData.players.has(thing) || false;
      default:
        return false;
    }
  }

  /**
   * Checks if a thing is visible in any vicinity (immediate or distant)
   * @param thing The name of the thing to check for
   * @returns True if the thing is in any vicinity
   */
  public in_vicinity(thing: string): boolean {
    // Check immediate vicinity first
    if (this.isInImmediateVicinity(thing)) {
      return true;
    }

    // Then check all directions in distant surroundings
    const distantSurroundings = this.envState.surroundings.getDistantSurroundings();
    if (!distantSurroundings) return false;

    for (const direction of Object.values(Direction)) {
      if (this.isInDistantDirection(thing, direction)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets the coordinates of the closest instance of a thing in a specific
   * direction
   * @param thing The name of the thing to find
   * @param direction The direction to look in
   * @returns The coordinates of the closest instance or null if not found
   */
  public get_coords_of_closest_thing(thing: string, direction?: Vicinity): Vec3 | null {
    let testDirs = direction ? [direction] : Object.values(Vicinity);
    const thingType = this.identifyThingType(thing);

    // First check immediate vicinity if we're looking for something in it
    if (direction === Vicinity.UP || direction === Vicinity.DOWN || direction === Vicinity.IMMEDIATE || direction == null) {
      const immediateSurroundings = this.envState.surroundings.getImmediateSurroundings();
      if (!immediateSurroundings) return null;

      switch (thingType) {
        case "block":
          if (immediateSurroundings.blocks?.has(thing)) {
            const blockPositions = immediateSurroundings.blocks.get(thing);
            if (blockPositions && blockPositions.length > 0) {
              // Find the closest one
              return this.findClosestPosition(blockPositions);
            }
          }
          break;

        case "biome":
          // Find biome ID from name
          const biomeId = this.getBiomeIdFromName(thing);
          if (biomeId === -1) return null;

          if (immediateSurroundings.biomes?.has(biomeId)) {
            // Find the closest one
            return this.bot.entity.position;
          }
          // Note: For biomes in immediate surroundings, we don't track positions
          // so we need an additional method to determine this
          break;

        case "player":
          return this.bot.players[thing]?.entity?.position || null;
        default:
          return null;
      }
    }

    for (const direction of testDirs) {
      // Check distant surroundings
      const distantSurroundings = this.envState.surroundings.getDistantSurroundings();
      if (!distantSurroundings) return null;

      const directionData = distantSurroundings.get(direction as unknown as Direction);
      if (!directionData) continue;

      switch (thingType) {
        case "block": {
          const found = directionData.blocksToClosestCoords?.get(thing)
          if (found != null) return found;
        }
        case "biome": {
          // Find biome ID from name
          const biomeId = this.getBiomeIdFromName(thing);
          if (biomeId === -1) continue;
          const found = directionData.biomesToClosestCoords?.get(biomeId)
          if (found != null) return found
        }
        case "player": {
          const found =  directionData.players.get(thing)?.position
          if (found != null) return found
        }
        // still leave in early exit for default.
        default:
          return null;
      }
    }

    return null;
  }

  /**
   * Find the biome ID from a biome name
   * @param biomeName The name of the biome
   * @returns The biome ID or -1 if not found
   */
  private getBiomeIdFromName(biomeName: string): number {
    for (const [id, biome] of Object.entries(this.bot.registry.biomes)) {
      if (biome.name === biomeName) {
        return parseInt(id);
      }
    }
    return -1;
  }

  /**
   * Finds the closest position from a list of positions to the bot
   * @param positions List of positions to check
   * @returns The closest position
   */
  private findClosestPosition(positions: Vec3[]): Vec3 | null {
    if (positions.length === 0) return null;
    if (positions.length === 1) return positions[0];

    const botPosition = this.bot.entity.position;
    let closestPosition = positions[0];
    let closestDistance = botPosition.distanceTo(positions[0]);

    for (let i = 1; i < positions.length; i++) {
      const distance = botPosition.distanceTo(positions[i]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPosition = positions[i];
      }
    }

    return closestPosition;
  }
}

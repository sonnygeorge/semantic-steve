import assert from "assert";
import { Bot } from "mineflayer";
import { ThingType } from "../thing-type";
import { Vec3 } from "vec3";
import { DirectionName } from "../../types";

export class BiomeType implements ThingType {
  bot: Bot;
  name: string;
  id: number;

  constructor(bot: Bot, name: string) {
    const biomeNames = Object.values(bot.registry.biomes).map((b) => b.name);
    if (!biomeNames.includes(name)) {
      throw new Error(`Invalid biome type: ${name}.`);
    }

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
      `This should be impossible. We should have thrown an error above.`,
    );
  }

  // ================================
  // Implementation of ThingType API
  // ================================

  public async isVisibleInImmediateSurroundings(): Promise<boolean> {
    for (const biomeName of this.bot.envState.surroundings.immediate.visible.getDistinctBiomeNames()) {
      if (biomeName === this.name) {
        return true;
      }
    }
    return false;
  }

  public async isVisibleInDistantSurroundings(): Promise<boolean> {
    for (const dir of this.bot.envState.surroundings.distant.values()) {
      for (const biomeName of dir.visible.getDistinctBiomeNames()) {
        if (biomeName === this.name) {
          return true;
        }
      }
    }
    return false;
  }

  public async locateNearest(): Promise<Vec3 | undefined> {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult !== null) {
      return immediateResult;
    }

    // If not found in immediate surroundings, try distant surroundings
    return this.locateNearestInDistantSurroundings();
  }

  public async locateNearestInImmediateSurroundings(): Promise<
    Vec3 | undefined
  > {
    for (const [
      name,
      closestCoords,
    ] of this.bot.envState.surroundings.immediate.visible.getBiomeNamesToClosestCoords()) {
      if (name === this.name) {
        return closestCoords.clone();
      }
    }
  }

  public async locateNearestInDistantSurroundings(
    direction?: DirectionName,
  ): Promise<Vec3 | undefined> {
    // If a specific direction is provided, check only that direction
    if (direction) {
      const vicinity = this.bot.envState.surroundings.distant.get(direction)!;
      for (const [
        name,
        closestCoords,
      ] of vicinity.visible.getBiomeNamesToClosestCoords()) {
        if (name === this.name) {
          return closestCoords.clone();
        }
      }
      return undefined; // Not found in the specified direction
    }

    // If no direction specified, check all directions
    const directions = Array.from(
      this.bot.envState.surroundings.distant.keys(),
    );

    // Find the closest coordinates across all directions
    let closestOfClosestCoords: Vec3 | undefined = undefined;
    let smallestDistance = Infinity;
    for (const dir of directions) {
      const vicinity = this.bot.envState.surroundings.distant.get(dir)!;
      for (const [
        name,
        closestCoords,
      ] of vicinity.visible.getBiomeNamesToClosestCoords()) {
        if (name === this.name) {
          const distance = closestCoords.distanceTo(this.bot.entity.position);
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

  public async isVisibleInImmediateSurroundingsAt(
    coords: Vec3,
  ): Promise<boolean> {
    throw new Error(
      "Method not implemented. This method is yet not usable for biomes.",
    );
  }
}

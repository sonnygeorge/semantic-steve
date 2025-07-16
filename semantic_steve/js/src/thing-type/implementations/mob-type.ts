import { Bot } from "mineflayer";
import { ThingType } from "../thing-type";
import { Vec3 } from "vec3";
import { DirectionName } from "../../types";
import { InvalidThingError } from "../../types";
import { MOB_ENTITY_TYPES } from "../../constants";

export class MobType implements ThingType {
  bot: Bot;
  name: string; // "villager", "zombie", etc.

  constructor(bot: Bot, name: string) {
    const entity = bot.registry.entitiesByName[name];
    if (!entity || !MOB_ENTITY_TYPES.includes(entity.type)) {
      throw new InvalidThingError(`Invalid mob entity type: ${name}.`);
    }
    this.name = name;
    this.bot = bot;
  }

  // ================================
  // Implementation of ThingType API
  // ================================

  public async isVisibleInImmediateSurroundings(): Promise<boolean> {
    for (const entityName of this.bot.envState.surroundings.immediate.visible.getDistinctMobNames()) {
      if (entityName === this.name) {
        return true;
      }
    }
    return false;
  }

  public async isVisibleInDistantSurroundings(): Promise<boolean> {
    for (const dir of this.bot.envState.surroundings.distant.values()) {
      for (const entityName of dir.visible.getDistinctMobNames()) {
        if (entityName === this.name) {
          return true;
        }
      }
    }
    return false;
  }

  public async locateNearest(): Promise<Vec3 | undefined> {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult) {
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
    ] of this.bot.envState.surroundings.immediate.visible.getMobNamesToClosestCoords()) {
      if (name === this.name) {
        return closestCoords.clone();
      }
    }
  }

  public async locateNearestInDistantSurroundings(
    direction?: DirectionName
  ): Promise<Vec3 | undefined> {
    // If a specific direction is provided, check only that direction
    if (direction) {
      const vicinity = this.bot.envState.surroundings.distant.get(direction)!;
      for (const [
        name,
        closestCoords,
      ] of vicinity.visible.getMobNamesToClosestCoords()) {
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
      for (const [
        name,
        closestCoords,
      ] of vicinity.visible.getMobNamesToClosestCoords()) {
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

  public async isVisibleInImmediateSurroundingsAt(
    position: Vec3
  ): Promise<boolean> {
    throw new Error(
      "Writing code that relies on constantly-moving mobs being in a specific " +
        "position probably shouldn't be written."
    );
  }
}

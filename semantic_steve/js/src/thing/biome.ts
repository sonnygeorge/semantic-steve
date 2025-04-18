import assert from "assert";
import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction, Vicinity } from "../env-state/surroundings";
import { MaybePromise } from "../types";

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
      `This should be impossible if this object is being created by the factory`
    );
  }

  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.biomes.has(this.id);
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.biomesToClosestCoords.has(this.id)
    );
  }

  locateNearest(): MaybePromise<Vec3 | undefined> {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult !== null) {
      return immediateResult;
    }

    // If not found in immediate surroundings, try distant surroundings
    return this.locateNearestInDistantSurroundings();
  }

  locateNearestInImmediateSurroundings(): MaybePromise<Vec3 | undefined> {
    if (this.isVisibleInImmediateSurroundings()) {
      return this.bot.entity.position.clone(); // assume we are in it
    }
  }

  locateNearestInDistantSurroundings(
    direction?: Direction
  ): MaybePromise<Vec3 | undefined> {
    console.log(
      `Attempting to locate nearest of ${this.name} in direction: ${direction}`
    );

    // If a specific direction is provided, check only that direction
    if (direction) {
      const surroundingsInDirection =
        this.bot.envState.surroundings.distant.get(direction);
      if (surroundingsInDirection) {
        return surroundingsInDirection.biomesToClosestCoords
          .get(this.id)
          ?.clone();
      }
      return undefined; // No blocks found in the specified direction
    }

    // If no direction specified, check all directions
    const directions = Array.from(
      this.bot.envState.surroundings.distant.keys()
    );

    // Find the closest coordinates across all directions
    let closestCoords: Vec3 | undefined = undefined;
    let minDistance = Infinity;
    for (const dir of directions) {
      const distant = this.bot.envState.surroundings.distant.get(dir);
      if (distant) {
        const coords = distant.biomesToClosestCoords.get(this.id);
        if (coords) {
          const distance = coords.distanceTo(this.bot.entity.position);
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

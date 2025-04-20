import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction } from "../env-state/surroundings";
import { MaybePromise, InvalidThingError } from "../types";
import { IndexedBlock } from "minecraft-data";

export class Block implements Thing {
  bot: Bot;
  name: string;
  data: IndexedBlock;

  constructor(bot: Bot, name: string) {
    if (name in bot.registry.blocksByName) {
      this.name = name;
      this.data = bot.registry.blocksByName[name];
    } else {
      throw new InvalidThingError(`Invalid block type: ${name}.`);
    }

    this.bot = bot;
    this.name = name;
  }

  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(
      this.name,
    );
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.blocksToCounts.has(this.name),
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
      this.bot.envState.surroundings.immediate.blocksToAllCoords.get(this.name);
    if (immediate && immediate.length > 0) {
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
        const count = surroundingsInDirection.blocksToCounts.get(this.name);
        if (count && count > 0) {
          return surroundingsInDirection.blocksToClosestCoords.get(this.name);
        }
      }
      return undefined; // No blocks found in the specified direction
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
        const count = surroundingsInDir.blocksToCounts.get(this.name);
        if (count && count > 0) {
          const coords = surroundingsInDir.blocksToClosestCoords.get(this.name);
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
}

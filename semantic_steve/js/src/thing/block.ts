import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction } from "../env-state/surroundings";
import { MaybePromise, InvalidThingError } from "../types";
import { IndexedBlock } from "minecraft-data";
import { simplify as nbtSimplify } from "prismarine-nbt";
import { Item as PItem } from "prismarine-item";
import { getDigTimeMS } from "../utils/block";

export class Block implements Thing {
  bot: Bot;
  name: string;
  pblock: IndexedBlock;

  constructor(bot: Bot, name: string) {
    if (name in bot.registry.blocksByName) {
      this.name = name;
      this.pblock = bot.registry.blocksByName[name];
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

  /**
   * Assess the current mineability of the block type generally.
   *
   * @returns [boolean, number | null] - A tuple where the first element indicates if the
   *   block is mineable and the second element is the best tool id to use (or null if no
   *   tool is needed).
   */
  public assessCurrentMineability(): [boolean, number | null] {
    const pblock = this.pblock; // new PBlock(this.pblock.id, 0, 0); // Default metadata/stateId
    if (!pblock.diggable) {
      return [false, null];
    }

    const canMine = (itemID: number | null): boolean => {
      const pBlockHasNoDrops = !pblock.drops || pblock.drops.length === 0;
      const pBlockHasNoHarvestTools = !pblock.harvestTools;
      if (pBlockHasNoDrops || pBlockHasNoHarvestTools) {
        return getDigTimeMS(this.bot, this.pblock.id, itemID) < 100000; // 100 seconds
      } else {
        if (itemID === null || !pblock.harvestTools) {
          return false;
        }
        return (
          itemID in pblock.harvestTools &&
          getDigTimeMS(this.bot, this.pblock.id, itemID) < 100000 // 100 seconds
        );
      }
    };

    let fastestDigTime = Number.MAX_VALUE;
    let bestTool: PItem | undefined = undefined;
    for (const item of this.bot.envState.inventory.itemSlots) {
      const itemID = item.type;
      if (canMine(itemID)) {
        const digTime = getDigTimeMS(
          this.bot,
          this.pblock.id,
          itemID,
          item && item.nbt ? nbtSimplify(item.nbt).Enchantments : [],
          this.bot.entity.effects,
        );
        if (digTime < fastestDigTime) {
          fastestDigTime = digTime;
          bestTool = item;
        }
      }
    }

    if (bestTool) {
      return [true, bestTool.type];
    } else if (canMine(null)) {
      return [true, null]; // If the block can be mined with the hand
    }
    return [false, null]; // No viable tool and block can't be mined w/ hand
  }
}

import { Bot } from "mineflayer";
import { ThingType } from "../thing-type";
import { Vec3 } from "vec3";
import { Direction } from "../../env-state/surroundings";
import { InvalidThingError } from "../../types";
import { IndexedBlock } from "minecraft-data";
import { simplify as nbtSimplify } from "prismarine-nbt";
import { Item as PItem } from "prismarine-item";
import { getDigTimeMS } from "../../utils/block";

export class BlockType implements ThingType {
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

  // =======================
  // Block-specific methods
  // =======================

  /**
   * Assess the current mineability of the block type generally (i.e., assuming an instance
   * of this block type is reachable, which this function does not check).
   *
   * @returns [boolean, number | null] - A tuple where the first element indicates if the
   *   block is mineable and the second element is the best tool id to use (or null if no
   *   tool).
   */
  public assessMineabilityWithCurrentTools(): [boolean, number | null] {
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

  // ================================
  // Implementation of ThingType API
  // ================================

  isVisibleInImmediateSurroundings(): boolean {
    for (const blockName of this.bot.envState.surroundings.immediate.getDistinctBlockNames()) {
      if (blockName === this.name) {
        return true;
      }
    }
    return false;
  }

  isVisibleInDistantSurroundings(): boolean {
    for (const dir of this.bot.envState.surroundings.distant.values()) {
      for (const blockName of dir.getDistinctBlockNames()) {
        if (blockName === this.name) {
          return true;
        }
      }
    }
    return false;
  }

  locateNearest(): Vec3 | undefined {
    // Try immediate surroundings first
    const immediateResult = this.locateNearestInImmediateSurroundings();
    if (immediateResult) {
      return immediateResult;
    }

    // If not found in immediate surroundings, try distant surroundings
    return this.locateNearestInDistantSurroundings();
  }

  locateNearestInImmediateSurroundings(): Vec3 | undefined {
    for (const [
      name,
      closestCoords,
    ] of this.bot.envState.surroundings.immediate.getBlockNamesToClosestCoords()) {
      if (name === this.name) {
        return closestCoords.clone();
      }
    }
  }

  locateNearestInDistantSurroundings(direction?: Direction): Vec3 | undefined {
    // If a specific direction is provided, check only that direction
    if (direction) {
      const vicinity = this.bot.envState.surroundings.distant.get(direction)!;
      for (const [
        name,
        closestCoords,
      ] of vicinity.getBlockNamesToClosestCoords()) {
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
      ] of vicinity.getBlockNamesToClosestCoords()) {
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

  isVisibleInImmediateSurroundingsAt(coords: Vec3): boolean {
    for (const [
      name,
      coordsIterable,
    ] of this.bot.envState.surroundings.immediate.getBlockNamesToAllCoords()) {
      if (name === this.name) {
        for (const blockCoords of coordsIterable) {
          if (blockCoords.equals(coords)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block as PBlock } from "prismarine-block";
import { AllLoadedBlocksCache } from "./cache";
import { AVLTree } from "avl";
import { ItemEntityWithData } from "../../types";

/**
 * Keys identifying the 10 "directions" that slice the *distant* surroundings.
 *
 * A subset of the 11 "vicinities" in the bot's surroundings (which additionally includes
 * the immediate surroundings vicinity).
 */
export enum Direction {
  UP = "up",
  DOWN = "down",
  NORTH = "north",
  NORTHEAST = "northeast",
  EAST = "east",
  SOUTHEAST = "southeast",
  SOUTH = "south",
  SOUTHWEST = "southwest",
  WEST = "west",
  NORTHWEST = "northwest",
}

/**
 * Keys used to identify the 11 regions of space around the bot.
 */
export enum Vicinity {
  IMMEDIATE_SURROUNDINGS = "immediate",
  DISTANT_SURROUNDINGS_UP = Direction.UP,
  DISTANT_SURROUNDINGS_DOWN = Direction.DOWN,
  DISTANT_SURROUNDINGS_NORTH = Direction.NORTH,
  DISTANT_SURROUNDINGS_NORTHEAST = Direction.NORTHEAST,
  DISTANT_SURROUNDINGS_EAST = Direction.EAST,
  DISTANT_SURROUNDINGS_SOUTHEAST = Direction.SOUTHEAST,
  DISTANT_SURROUNDINGS_SOUTH = Direction.SOUTH,
  DISTANT_SURROUNDINGS_SOUTHWEST = Direction.SOUTHWEST,
  DISTANT_SURROUNDINGS_WEST = Direction.WEST,
  DISTANT_SURROUNDINGS_NORTHWEST = Direction.NORTHWEST,
}

/**
 * Takes a point and calculates which of the 11 "vicinities" it is in relative to the bot's
 * current position (if any).
 *
 * The space in around the bot is divided into 11 "vicinities" as follows:
 *
 * 1. `IMMEDIATE_SURROUNDINGS`:
 *    - Is the space within an immediate sphere of radius `ImmediateSurroundingsRadius`.
 *
 * 2. `DISTANT_SURROUNDINGS_UP` and `DISTANT_SURROUNDINGS_DOWN`:
 *    - Are cylindrical columns extending up and down from the circumference of the
 *     IMMEDIATE_SURROUNDINGS sphere, but not extending beyond `DistantSurroundingsRadius`.
 *
 * 3. `DISTANT_SURROUNDINGS_{NORTH, NORTHEAST, EAST, SOUTHEAST, SOUTH, SOUTHWEST, WEST, NORTHWEST}`:
 *    - Partition the remaining space in a sphere of radius `DistantSurroundingsRadius` into
 *      8 "wedges".
 *
 *      (Hint: picture an apple sliced by that one apple slicer kitchen tool that gets
 *      pressed down onto an apple and creates apple wedges while remove a center column
 *      containing the apple core.)
 *
 *
 * Horizontal slice (i.e. "viewed from above") at current bot y-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO    \       N       /    OOo
 *            oOO        \             /        OOo
 *          oOO           \           /           OOo
 *        oOO     NW       \         /     NE       OOo
 *       oOO.               \       /               .OOo
 *      oOO  '--.__         ooooooooo         __.--'  OOo
 *     oOO         ''__   oo         oo   __''         OOo
 *     oOO             'oo             oo'             OOo
 *     oOO   W          o   IMMEDIATE   o         E    OOo
 *     oOO           __.oo             oo.__           OOo
 *     oOO    __.--''     oo         oo     ''--.__    OOo
 *      oOO -'              ooooooooo              '- OOo
 *       oOO                /       \                OOo
 *        oOO     SW       /         \       SE     OOo
 *          oOO           /           \            OOo
 *            oO         /             \         OOo
 *               oOO    /       S       \     OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 *
 *  Horizontal slice (i.e. "viewed from the side") at current bot x-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO   |                 |   OOo
 *            oOO      |       UP        |      OOo
 *          oOO        |                 |        OOo
 *        oOO          |                 |          OOo
 *       oOO           |                 |           OOo
 *      oOO            |    ooooooooo    |            OOo
 *     oOO             |  oo         oo  |             OOo
 *     oOO              oo             oo              OOo
 *     oOO   S          o   IMMEDIATE   o         N    OOo
 *     oOO              oo             oo              OOo
 *     oOO             |  oo         oo  |             OOo
 *      oOO            |    ooooooooo    |            OOo
 *       oOO           |                 |           OOo
 *        oOO          |                 |          OOo
 *          oOO        |                 |         OOo
 *            oO       |      DOWN       |       OOo
 *               oOO   |                 |    OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 *
 * @param bot - The bot relative to which the position is assessed.
 * @param pos - The position to classify the vicinity of.
 * @returns The vicinity of the position relative to the bot, or undefined if is not in
 *   any of the 11 vicinities (i.e., is outside of the distant surroundings radius)
 */
export function classifyVicinityOfPosition(
  bot: Bot,
  immediateSurroundingsRadius: number,
  distantSurroundingsRadius: number,
  pos: Vec3,
): Vicinity | undefined {
  const botPos = bot.entity.position;
  const distanceToPos = botPos.distanceTo(pos);

  if (distanceToPos <= immediateSurroundingsRadius) {
    return Vicinity.IMMEDIATE_SURROUNDINGS;
  } else if (distanceToPos > distantSurroundingsRadius) {
    return undefined;
  } else {
    // The position is in the bot's distant surroundings, we must determine in which of
    // the 10 directions it is located.

    // First, check for up/down, i.e., the cylindrical column created by the slicer's
    // circle in the apple-slicer analogy.

    const horizontalDist = Math.sqrt(
      Math.pow(pos.x - botPos.x, 2) + Math.pow(pos.z - botPos.z, 2),
    );
    if (horizontalDist <= immediateSurroundingsRadius) {
      // If the point's horizontal distance to the bot (on the xz plane) is less than the
      // immediate surrounding's radius, it is within this column.

      // Of course, we already know the point is not in the immediate surroundings, so we
      // don't need to re-check that.

      // Now, if the point is above the bot, it is in the up direction, otherwise it is
      // in the down direction.
      return pos.y > botPos.y
        ? Vicinity.DISTANT_SURROUNDINGS_UP
        : Vicinity.DISTANT_SURROUNDINGS_DOWN;
    }

    // Knowing that the point is in the distant surroundings, but not in the up or down
    // vicinities, we can simply determine which of the leftover
    // cardinal-direction-associated distant-surroundings vicinities (i.e., which slice of
    // the apple in the apple-slicer analogy) using the point's horizontal angle from the
    // bot (on the xz plane).
    const angle =
      ((Math.atan2(pos.x - botPos.x, botPos.z - pos.z) * 180) / Math.PI + 360) %
      360;
    if (angle < 22.5 || angle >= 337.5)
      return Vicinity.DISTANT_SURROUNDINGS_NORTH;
    if (angle < 67.5) return Vicinity.DISTANT_SURROUNDINGS_NORTHEAST;
    if (angle < 112.5) return Vicinity.DISTANT_SURROUNDINGS_EAST;
    if (angle < 157.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTHEAST;
    if (angle < 202.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTH;
    if (angle < 247.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTHWEST;
    if (angle < 292.5) return Vicinity.DISTANT_SURROUNDINGS_WEST;
    return Vicinity.DISTANT_SURROUNDINGS_NORTHWEST;
  }
}

/**
 * Intermediate data interface for updating/accessing the visible contents of one of the
 * 11 vicinities around the bot.
 */
export class VisibleVicinityContents {
  private bot: Bot;
  // Maps to AVL trees to eagerly organize thing data objects by distance to bot
  blockNamesToDistanceSortedAVLTreeOfBlocks: Map<
    string,
    AVLTree<string, PBlock>
  > = new Map();
  itemsNamesToDistanceSortedAVLTreeOfItems: Map<
    string,
    AVLTree<string, ItemEntityWithData>
  > = new Map();
  biomeNamesToDistanceSortedAVLTreeOfCoords: Map<
    string,
    AVLTree<string, Vec3>
  > = new Map();
  // Maps from keys to thing the thing data objects in the AVL trees
  blocksLookup: Map<string, PBlock> = new Map();
  itemsLookup: Map<string, ItemEntityWithData> = new Map();
  // Maps from keys to thing data grouped by type name
  blockNamesToBlocks: Map<string, Map<string, PBlock>> = new Map();
  itemNamesToItems: Map<string, Map<string, ItemEntityWithData>> = new Map();
  biomeNamesToBlocks: Map<string, Map<string, PBlock>> = new Map();
  // Maps for keeping counts of things by type name
  biomeNamesToCounts: Map<string, number> = new Map();
  blockNamesToCounts: Map<string, number> = new Map();
  itemEntityNamesToCounts: Map<string, number> = new Map();

  constructor(bot: Bot) {
    this.bot = bot;
  }

  // =========================
  // AVL tree factory methods
  // =========================

  private getEmptyBlocksAVLTree(): AVLTree<string, PBlock> {
    const customComparator = (a: string, b: string) => {
      const blockA = this.blocksLookup.get(a);
      const blockB = this.blocksLookup.get(b);
      assert(blockA && blockB);
      const distA = blockA.position.distanceTo(this.bot.entity.position);
      const distB = blockB.position.distanceTo(this.bot.entity.position);
      return distA - distB || a.localeCompare(b);
    };
    return new AVLTree<string, PBlock>(
      customComparator,
      true, // (true here = no duplicates)
    );
  }

  private getEmptyItemsAVLTree(): AVLTree<string, ItemEntityWithData> {
    const customComparator = (a: string, b: string) => {
      const itemA = this.itemsLookup.get(a);
      const itemB = this.itemsLookup.get(b);
      assert(itemA && itemB);
      const distA = itemA.entity.position.distanceTo(this.bot.entity.position);
      const distB = itemB.entity.position.distanceTo(this.bot.entity.position);
      return distA - distB || a.localeCompare(b);
    };
    return new AVLTree<string, ItemEntityWithData>(
      customComparator,
      true, // (true here = no duplicates)
    );
  }

  private getEmptyBiomeCoordsAVLTree(): AVLTree<string, Vec3> {
    const customComparator = (a: string, b: string) => {
      const posA = AllLoadedBlocksCache.getVec3FromKey(a);
      const posB = AllLoadedBlocksCache.getVec3FromKey(b);
      const distA = posA.distanceTo(this.bot.entity.position);
      const distB = posB.distanceTo(this.bot.entity.position);
      return distA - distB || a.localeCompare(b);
    };
    return new AVLTree<string, Vec3>(
      customComparator,
      true, // (true here = no duplicates)
    );
  }

  // ==========================
  // Add/remove to this object
  // ==========================

  public addBlock(block: PBlock): void {
    const blockKey = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    assert(!this.blocksLookup.has(blockKey));
    // Add to the Map<{key}, PBlock> map
    this.blocksLookup.set(blockKey, block);

    const blockName = block.name;
    // Add to the Map<{block name}, Map<{key}, PBlock>> map
    if (!this.blockNamesToBlocks.has(blockName)) {
      this.blockNamesToBlocks.set(blockName, new Map());
    }
    const blocks = this.blockNamesToBlocks.get(blockName);
    assert(blocks);
    assert(!blocks.has(blockKey));
    blocks.set(blockKey, block);
    // If we don't have an AVL tree for this block type, create one.
    if (!this.blockNamesToDistanceSortedAVLTreeOfBlocks.has(blockName)) {
      this.blockNamesToDistanceSortedAVLTreeOfBlocks.set(
        blockName,
        this.getEmptyBlocksAVLTree(),
      );
    }
    // Insert the block into the associated AVL tree.
    const avlTree =
      this.blockNamesToDistanceSortedAVLTreeOfBlocks.get(blockName);
    assert(avlTree);
    const key = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    avlTree.insert(key, block);
    // Increment the count for the block's type.
    this.blockNamesToCounts.set(
      blockName,
      (this.blockNamesToCounts.get(blockName) || 0) + 1,
    );

    const biomeName = block.biome.name;
    // Add to the Map<{biome name}, Map<{key}, PBlock>> map
    if (!this.biomeNamesToBlocks.has(biomeName)) {
      this.biomeNamesToBlocks.set(biomeName, new Map());
    }
    const biomeBlocks = this.biomeNamesToBlocks.get(biomeName);
    assert(biomeBlocks);
    assert(!biomeBlocks.has(blockKey));
    biomeBlocks.set(blockKey, block);
    // If we don't have an AVL tree for this biome, create one.
    if (!this.biomeNamesToDistanceSortedAVLTreeOfCoords.has(biomeName)) {
      this.biomeNamesToDistanceSortedAVLTreeOfCoords.set(
        biomeName,
        this.getEmptyBiomeCoordsAVLTree(),
      );
    }
    // Insert the block coords into the associated biome AVL tree.
    const biomeAVLTree =
      this.biomeNamesToDistanceSortedAVLTreeOfCoords.get(biomeName);
    assert(biomeAVLTree);
    const biomeKey = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    biomeAVLTree.insert(biomeKey, block.position);
    // Increment the count for the biome type.
    this.biomeNamesToCounts.set(
      biomeName,
      (this.biomeNamesToCounts.get(biomeName) || 0) + 1,
    );
  }

  public removeBlock(block: PBlock): void {
    const blockKey = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    assert(this.blocksLookup.has(blockKey));
    // Remove from the Map<{key}, PBlock> map
    this.blocksLookup.delete(blockKey);

    const blockName = block.name;
    // Remove from the Map<{block name}, Map<{key}, PBlock>> map
    const blocks = this.blockNamesToBlocks.get(blockName);
    assert(blocks);
    assert(blocks.has(blockKey));
    blocks.delete(blockKey);
    // Get the block AVL tree for the block's type.
    const avlTree =
      this.blockNamesToDistanceSortedAVLTreeOfBlocks.get(blockName);
    assert(avlTree);
    // Remove the block from the AVL tree.
    const removedKey = avlTree.remove(blockKey);
    assert(removedKey);
    // Decrement the count for the block's type & biome.
    const prevBlockCount = this.blockNamesToCounts.get(block.name);
    assert(prevBlockCount && prevBlockCount > 0);
    this.blockNamesToCounts.set(block.name, prevBlockCount - 1);

    const biomeName = block.biome.name;
    // Remove from the Map<{biome name}, Map<{key}, PBlock>> map
    const biomeBlocks = this.biomeNamesToBlocks.get(biomeName);
    assert(biomeBlocks);
    assert(biomeBlocks.has(blockKey));
    biomeBlocks.delete(blockKey);
    // Get the biome AVL tree for the block's biome.
    const biomeAVLTree =
      this.biomeNamesToDistanceSortedAVLTreeOfCoords.get(biomeName);
    assert(biomeAVLTree);
    // Remove the block's position from the biome AVL tree.
    const biomeKey = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    const removedBiomeKey = biomeAVLTree.remove(biomeKey);
    assert(removedBiomeKey);
    // If block's position was removed, decrement the count for the biome type.
    const prevBiomeCount = this.biomeNamesToCounts.get(biomeName);
    assert(prevBiomeCount && prevBiomeCount > 0);
    this.biomeNamesToCounts.set(biomeName, prevBiomeCount - 1);
  }

  public async addItem(itemEntityWithData: ItemEntityWithData): Promise<void> {
    const uuidKey = itemEntityWithData.entity.uuid;
    assert(uuidKey);
    assert(!this.itemsLookup.has(uuidKey));
    // Add to the <{key}, ItemEntityWithData> map
    this.itemsLookup.set(uuidKey, itemEntityWithData);

    const itemName = itemEntityWithData.itemData.name;
    // Add to the Map<{item name}, Map<{key}, ItemEntityWithData>> map
    if (!this.itemNamesToItems.has(itemName)) {
      this.itemNamesToItems.set(itemName, new Map());
    }
    const items = this.itemNamesToItems.get(itemName);
    assert(items);
    assert(!items.has(uuidKey));
    items.set(uuidKey, itemEntityWithData);
    // If we don't have an AVL tree for this item type, create one.
    if (!this.itemsNamesToDistanceSortedAVLTreeOfItems.has(itemName)) {
      this.itemsNamesToDistanceSortedAVLTreeOfItems.set(
        itemName,
        this.getEmptyItemsAVLTree(),
      );
    }
    // Insert the item entity into the associated AVL tree.
    const avlTree = this.itemsNamesToDistanceSortedAVLTreeOfItems.get(itemName);
    assert(avlTree);
    avlTree.insert(uuidKey, itemEntityWithData);
    // Increment the count for the item type.
    this.itemEntityNamesToCounts.set(
      itemName,
      (this.itemEntityNamesToCounts.get(itemName) || 0) + 1,
    );
  }

  public removeItem(itemEntityWithData: ItemEntityWithData): void {
    const uuidKey = itemEntityWithData.entity.uuid;
    assert(uuidKey);
    assert(this.itemsLookup.has(uuidKey));
    // Remove from the <{key}, ItemEntityWithData> map
    this.itemsLookup.delete(uuidKey);

    const itemName = itemEntityWithData.itemData.name;
    // Remove from the Map<{item name}, Map<{key}, ItemEntityWithData>> map
    const items = this.itemNamesToItems.get(itemName);
    assert(items);
    assert(items.has(uuidKey));
    items.delete(uuidKey);
    // Get the item AVL tree for the item's type.
    const avlTree = this.itemsNamesToDistanceSortedAVLTreeOfItems.get(itemName);
    assert(avlTree);
    // Remove the item entity from the AVL tree.
    const removedKey = avlTree.remove(uuidKey);
    assert(removedKey);
    // Decrement the count for the item's type.
    const prevItemCount = this.itemEntityNamesToCounts.get(itemName);
    assert(prevItemCount && prevItemCount > 0);
    this.itemEntityNamesToCounts.set(itemName, prevItemCount - 1);
  }

  // ====================================================
  // Getters (for more idiomatic data access externally)
  // ====================================================

  public *getDistinctBlockNames(): Iterable<string> {
    for (const blockName of this.blockNamesToBlocks.keys()) {
      yield blockName;
    }
  }

  public *getBlockNamesToClosestCoords(): Iterable<[string, Vec3]> {
    for (const [name, avlTree] of this
      .blockNamesToDistanceSortedAVLTreeOfBlocks) {
      const closestBlockKey = avlTree.min();
      assert(closestBlockKey);
      const closestBlock = this.blocksLookup.get(closestBlockKey);
      assert(closestBlock);
      yield [name, closestBlock.position];
    }
  }

  public *getBlockNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {
    for (const [name, avlTree] of this
      .blockNamesToDistanceSortedAVLTreeOfBlocks) {
      const self = this; // Capture `this` for the generator function
      function* coordsGenerator() {
        for (const blockKey of avlTree.keys()) {
          const block = self.blocksLookup.get(blockKey);
          assert(block);
          yield block.position;
        }
      }
      yield [name, coordsGenerator()];
    }
  }

  public *getDistinctBiomeNames(): Iterable<string> {
    for (const biomeName of this.biomeNamesToBlocks.keys()) {
      yield biomeName;
    }
  }

  public *getBiomeNamesToClosestCoords(): Iterable<[string, Vec3]> {
    for (const [name, avlTree] of this
      .biomeNamesToDistanceSortedAVLTreeOfCoords) {
      const closestBiomeKey = avlTree.min();
      assert(closestBiomeKey);
      const closestBiomePos =
        AllLoadedBlocksCache.getVec3FromKey(closestBiomeKey);
      yield [name, closestBiomePos];
    }
  }

  public *getBiomeNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {
    for (const [name, avlTree] of this
      .biomeNamesToDistanceSortedAVLTreeOfCoords) {
      const self = this; // Capture `this` for the generator function
      function* coordsGenerator() {
        for (const biomeKey of avlTree.keys()) {
          const pos = AllLoadedBlocksCache.getVec3FromKey(biomeKey);
          yield pos;
        }
      }
      yield [name, coordsGenerator()];
    }
  }

  public *getDistinctItemNames(): Iterable<string> {
    for (const itemName of this.itemNamesToItems.keys()) {
      yield itemName;
    }
  }

  public *getItemNamesToClosestCoords(): Iterable<[string, Vec3]> {
    for (const [name, avlTree] of this
      .itemsNamesToDistanceSortedAVLTreeOfItems) {
      const closestItemKey = avlTree.min();
      assert(closestItemKey);
      const closestItem = this.itemsLookup.get(closestItemKey);
      assert(closestItem);
      yield [name, closestItem.entity.position];
    }
  }

  public *getItemNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {
    for (const [name, avlTree] of this
      .itemsNamesToDistanceSortedAVLTreeOfItems) {
      const self = this; // Capture `this` for the generator function
      function* coordsGenerator() {
        for (const itemKey of avlTree.keys()) {
          const item = self.itemsLookup.get(itemKey);
          assert(item);
          yield item.entity.position;
        }
      }
      yield [name, coordsGenerator()];
    }
  }
}

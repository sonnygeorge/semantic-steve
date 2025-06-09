"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibleVicinityContents = exports.Vicinity = exports.Direction = void 0;
exports.classifyVicinityOfPosition = classifyVicinityOfPosition;
const assert_1 = __importDefault(require("assert"));
const cache_1 = require("./cache");
const avl_1 = require("avl");
/**
 * Keys identifying the 10 "directions" that slice the *distant* surroundings.
 *
 * A subset of the 11 "vicinities" in the bot's surroundings (which additionally includes
 * the immediate surroundings vicinity).
 */
var Direction;
(function (Direction) {
    Direction["UP"] = "up";
    Direction["DOWN"] = "down";
    Direction["NORTH"] = "north";
    Direction["NORTHEAST"] = "northeast";
    Direction["EAST"] = "east";
    Direction["SOUTHEAST"] = "southeast";
    Direction["SOUTH"] = "south";
    Direction["SOUTHWEST"] = "southwest";
    Direction["WEST"] = "west";
    Direction["NORTHWEST"] = "northwest";
})(Direction || (exports.Direction = Direction = {}));
/**
 * Keys used to identify the 11 regions of space around the bot.
 */
var Vicinity;
(function (Vicinity) {
    Vicinity["IMMEDIATE_SURROUNDINGS"] = "immediate";
    Vicinity["DISTANT_SURROUNDINGS_UP"] = "up";
    Vicinity["DISTANT_SURROUNDINGS_DOWN"] = "down";
    Vicinity["DISTANT_SURROUNDINGS_NORTH"] = "north";
    Vicinity["DISTANT_SURROUNDINGS_NORTHEAST"] = "northeast";
    Vicinity["DISTANT_SURROUNDINGS_EAST"] = "east";
    Vicinity["DISTANT_SURROUNDINGS_SOUTHEAST"] = "southeast";
    Vicinity["DISTANT_SURROUNDINGS_SOUTH"] = "south";
    Vicinity["DISTANT_SURROUNDINGS_SOUTHWEST"] = "southwest";
    Vicinity["DISTANT_SURROUNDINGS_WEST"] = "west";
    Vicinity["DISTANT_SURROUNDINGS_NORTHWEST"] = "northwest";
})(Vicinity || (exports.Vicinity = Vicinity = {}));
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
function classifyVicinityOfPosition(bot, immediateSurroundingsRadius, distantSurroundingsRadius, pos) {
    const botPos = bot.entity.position;
    const distanceToPos = botPos.distanceTo(pos);
    if (distanceToPos <= immediateSurroundingsRadius) {
        return Vicinity.IMMEDIATE_SURROUNDINGS;
    }
    else if (distanceToPos > distantSurroundingsRadius) {
        return undefined;
    }
    else {
        // The position is in the bot's distant surroundings, we must determine in which of
        // the 10 directions it is located.
        // First, check for up/down, i.e., the cylindrical column created by the slicer's
        // circle in the apple-slicer analogy.
        const horizontalDist = Math.sqrt(Math.pow(pos.x - botPos.x, 2) + Math.pow(pos.z - botPos.z, 2));
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
        const angle = ((Math.atan2(pos.x - botPos.x, botPos.z - pos.z) * 180) / Math.PI + 360) %
            360;
        if (angle < 22.5 || angle >= 337.5)
            return Vicinity.DISTANT_SURROUNDINGS_NORTH;
        if (angle < 67.5)
            return Vicinity.DISTANT_SURROUNDINGS_NORTHEAST;
        if (angle < 112.5)
            return Vicinity.DISTANT_SURROUNDINGS_EAST;
        if (angle < 157.5)
            return Vicinity.DISTANT_SURROUNDINGS_SOUTHEAST;
        if (angle < 202.5)
            return Vicinity.DISTANT_SURROUNDINGS_SOUTH;
        if (angle < 247.5)
            return Vicinity.DISTANT_SURROUNDINGS_SOUTHWEST;
        if (angle < 292.5)
            return Vicinity.DISTANT_SURROUNDINGS_WEST;
        return Vicinity.DISTANT_SURROUNDINGS_NORTHWEST;
    }
}
/**
 * Intermediate data interface for updating/accessing the visible contents of one of the
 * 11 vicinities around the bot.
 */
class VisibleVicinityContents {
    constructor(bot) {
        // Maps to AVL trees to eagerly organize thing data objects by distance to bot
        this.blockNamesToDistanceSortedAVLTreeOfBlocks = new Map();
        this.itemsNamesToDistanceSortedAVLTreeOfItems = new Map();
        this.biomeNamesToDistanceSortedAVLTreeOfCoords = new Map();
        // Maps from keys to thing the thing data objects in the AVL trees
        this.blocksLookup = new Map();
        this.itemsLookup = new Map();
        // Maps from keys to thing data grouped by type name
        this.blockNamesToBlocks = new Map();
        this.itemNamesToItems = new Map();
        this.biomeNamesToBlocks = new Map();
        // Maps for keeping counts of things by type name
        this.biomeNamesToCounts = new Map();
        this.blockNamesToCounts = new Map();
        this.itemEntityNamesToCounts = new Map();
        this.bot = bot;
    }
    // =========================
    // AVL tree factory methods
    // =========================
    getEmptyBlocksAVLTree() {
        const customComparator = (a, b) => {
            const blockA = this.blocksLookup.get(a);
            const blockB = this.blocksLookup.get(b);
            (0, assert_1.default)(blockA && blockB);
            const distA = blockA.position.distanceTo(this.bot.entity.position);
            const distB = blockB.position.distanceTo(this.bot.entity.position);
            return distA - distB || a.localeCompare(b);
        };
        return new avl_1.AVLTree(customComparator, true);
    }
    getEmptyItemsAVLTree() {
        const customComparator = (a, b) => {
            const itemA = this.itemsLookup.get(a);
            const itemB = this.itemsLookup.get(b);
            (0, assert_1.default)(itemA && itemB);
            const distA = itemA.entity.position.distanceTo(this.bot.entity.position);
            const distB = itemB.entity.position.distanceTo(this.bot.entity.position);
            return distA - distB || a.localeCompare(b);
        };
        return new avl_1.AVLTree(customComparator, true);
    }
    getEmptyBiomeCoordsAVLTree() {
        const customComparator = (a, b) => {
            const posA = cache_1.AllLoadedBlocksCache.getVec3FromKey(a);
            const posB = cache_1.AllLoadedBlocksCache.getVec3FromKey(b);
            const distA = posA.distanceTo(this.bot.entity.position);
            const distB = posB.distanceTo(this.bot.entity.position);
            return distA - distB || a.localeCompare(b);
        };
        return new avl_1.AVLTree(customComparator, true);
    }
    // ==========================
    // Add/remove to this object
    // ==========================
    addBlock(block) {
        const blockKey = cache_1.AllLoadedBlocksCache.getKeyFromVec3(block.position);
        (0, assert_1.default)(!this.blocksLookup.has(blockKey));
        // Add to the Map<{key}, PBlock> map
        this.blocksLookup.set(blockKey, block);
        const blockName = block.name;
        // Add to the Map<{block name}, Map<{key}, PBlock>> map
        if (!this.blockNamesToBlocks.has(blockName)) {
            this.blockNamesToBlocks.set(blockName, new Map());
        }
        const blocks = this.blockNamesToBlocks.get(blockName);
        (0, assert_1.default)(blocks);
        (0, assert_1.default)(!blocks.has(blockKey));
        blocks.set(blockKey, block);
        // If we don't have an AVL tree for this block type, create one.
        if (!this.blockNamesToDistanceSortedAVLTreeOfBlocks.has(blockName)) {
            this.blockNamesToDistanceSortedAVLTreeOfBlocks.set(blockName, this.getEmptyBlocksAVLTree());
        }
        // Insert the block into the associated AVL tree.
        const avlTree = this.blockNamesToDistanceSortedAVLTreeOfBlocks.get(blockName);
        (0, assert_1.default)(avlTree);
        const key = cache_1.AllLoadedBlocksCache.getKeyFromVec3(block.position);
        avlTree.insert(key, block);
        // Increment the count for the block's type.
        this.blockNamesToCounts.set(blockName, (this.blockNamesToCounts.get(blockName) || 0) + 1);
        const biomeName = block.biome.name;
        // Add to the Map<{biome name}, Map<{key}, PBlock>> map
        if (!this.biomeNamesToBlocks.has(biomeName)) {
            this.biomeNamesToBlocks.set(biomeName, new Map());
        }
        const biomeBlocks = this.biomeNamesToBlocks.get(biomeName);
        (0, assert_1.default)(biomeBlocks);
        (0, assert_1.default)(!biomeBlocks.has(blockKey));
        biomeBlocks.set(blockKey, block);
        // If we don't have an AVL tree for this biome, create one.
        if (!this.biomeNamesToDistanceSortedAVLTreeOfCoords.has(biomeName)) {
            this.biomeNamesToDistanceSortedAVLTreeOfCoords.set(biomeName, this.getEmptyBiomeCoordsAVLTree());
        }
        // Insert the block coords into the associated biome AVL tree.
        const biomeAVLTree = this.biomeNamesToDistanceSortedAVLTreeOfCoords.get(biomeName);
        (0, assert_1.default)(biomeAVLTree);
        const biomeKey = cache_1.AllLoadedBlocksCache.getKeyFromVec3(block.position);
        biomeAVLTree.insert(biomeKey, block.position);
        // Increment the count for the biome type.
        this.biomeNamesToCounts.set(biomeName, (this.biomeNamesToCounts.get(biomeName) || 0) + 1);
    }
    removeBlock(block) {
        const blockKey = cache_1.AllLoadedBlocksCache.getKeyFromVec3(block.position);
        (0, assert_1.default)(this.blocksLookup.has(blockKey));
        // Remove from the Map<{key}, PBlock> map
        this.blocksLookup.delete(blockKey);
        const blockName = block.name;
        // Remove from the Map<{block name}, Map<{key}, PBlock>> map
        const blocks = this.blockNamesToBlocks.get(blockName);
        (0, assert_1.default)(blocks);
        (0, assert_1.default)(blocks.has(blockKey));
        blocks.delete(blockKey);
        // Get the block AVL tree for the block's type.
        const avlTree = this.blockNamesToDistanceSortedAVLTreeOfBlocks.get(blockName);
        (0, assert_1.default)(avlTree);
        // Remove the block from the AVL tree.
        const removedKey = avlTree.remove(blockKey);
        (0, assert_1.default)(removedKey);
        // Decrement the count for the block's type & biome.
        const prevBlockCount = this.blockNamesToCounts.get(block.name);
        (0, assert_1.default)(prevBlockCount && prevBlockCount > 0);
        this.blockNamesToCounts.set(block.name, prevBlockCount - 1);
        const biomeName = block.biome.name;
        // Remove from the Map<{biome name}, Map<{key}, PBlock>> map
        const biomeBlocks = this.biomeNamesToBlocks.get(biomeName);
        (0, assert_1.default)(biomeBlocks);
        (0, assert_1.default)(biomeBlocks.has(blockKey));
        biomeBlocks.delete(blockKey);
        // Get the biome AVL tree for the block's biome.
        const biomeAVLTree = this.biomeNamesToDistanceSortedAVLTreeOfCoords.get(biomeName);
        (0, assert_1.default)(biomeAVLTree);
        // Remove the block's position from the biome AVL tree.
        const biomeKey = cache_1.AllLoadedBlocksCache.getKeyFromVec3(block.position);
        const removedBiomeKey = biomeAVLTree.remove(biomeKey);
        (0, assert_1.default)(removedBiomeKey);
        // If block's position was removed, decrement the count for the biome type.
        const prevBiomeCount = this.biomeNamesToCounts.get(biomeName);
        (0, assert_1.default)(prevBiomeCount && prevBiomeCount > 0);
        this.biomeNamesToCounts.set(biomeName, prevBiomeCount - 1);
    }
    addItem(itemEntityWithData) {
        return __awaiter(this, void 0, void 0, function* () {
            const uuidKey = itemEntityWithData.entity.uuid;
            (0, assert_1.default)(uuidKey);
            (0, assert_1.default)(!this.itemsLookup.has(uuidKey));
            // Add to the <{key}, ItemEntityWithData> map
            this.itemsLookup.set(uuidKey, itemEntityWithData);
            const itemName = itemEntityWithData.itemData.name;
            // Add to the Map<{item name}, Map<{key}, ItemEntityWithData>> map
            if (!this.itemNamesToItems.has(itemName)) {
                this.itemNamesToItems.set(itemName, new Map());
            }
            const items = this.itemNamesToItems.get(itemName);
            (0, assert_1.default)(items);
            (0, assert_1.default)(!items.has(uuidKey));
            items.set(uuidKey, itemEntityWithData);
            // If we don't have an AVL tree for this item type, create one.
            if (!this.itemsNamesToDistanceSortedAVLTreeOfItems.has(itemName)) {
                this.itemsNamesToDistanceSortedAVLTreeOfItems.set(itemName, this.getEmptyItemsAVLTree());
            }
            // Insert the item entity into the associated AVL tree.
            const avlTree = this.itemsNamesToDistanceSortedAVLTreeOfItems.get(itemName);
            (0, assert_1.default)(avlTree);
            avlTree.insert(uuidKey, itemEntityWithData);
            // Increment the count for the item type.
            this.itemEntityNamesToCounts.set(itemName, (this.itemEntityNamesToCounts.get(itemName) || 0) + 1);
        });
    }
    removeItem(itemEntityWithData) {
        const uuidKey = itemEntityWithData.entity.uuid;
        (0, assert_1.default)(uuidKey);
        (0, assert_1.default)(this.itemsLookup.has(uuidKey));
        // Remove from the <{key}, ItemEntityWithData> map
        this.itemsLookup.delete(uuidKey);
        const itemName = itemEntityWithData.itemData.name;
        // Remove from the Map<{item name}, Map<{key}, ItemEntityWithData>> map
        const items = this.itemNamesToItems.get(itemName);
        (0, assert_1.default)(items);
        (0, assert_1.default)(items.has(uuidKey));
        items.delete(uuidKey);
        // Get the item AVL tree for the item's type.
        const avlTree = this.itemsNamesToDistanceSortedAVLTreeOfItems.get(itemName);
        (0, assert_1.default)(avlTree);
        // Remove the item entity from the AVL tree.
        const removedKey = avlTree.remove(uuidKey);
        (0, assert_1.default)(removedKey);
        // Decrement the count for the item's type.
        const prevItemCount = this.itemEntityNamesToCounts.get(itemName);
        (0, assert_1.default)(prevItemCount && prevItemCount > 0);
        this.itemEntityNamesToCounts.set(itemName, prevItemCount - 1);
    }
    // ====================================================
    // Getters (for more idiomatic data access externally)
    // ====================================================
    *getDistinctBlockNames() {
        for (const blockName of this.blockNamesToBlocks.keys()) {
            yield blockName;
        }
    }
    *getBlockNamesToClosestCoords() {
        for (const [name, avlTree] of this
            .blockNamesToDistanceSortedAVLTreeOfBlocks) {
            const closestBlockKey = avlTree.min();
            (0, assert_1.default)(closestBlockKey);
            const closestBlock = this.blocksLookup.get(closestBlockKey);
            (0, assert_1.default)(closestBlock);
            yield [name, closestBlock.position];
        }
    }
    *getBlockNamesToAllCoords() {
        for (const [name, avlTree] of this
            .blockNamesToDistanceSortedAVLTreeOfBlocks) {
            const self = this; // Capture `this` for the generator function
            function* coordsGenerator() {
                for (const blockKey of avlTree.keys()) {
                    const block = self.blocksLookup.get(blockKey);
                    (0, assert_1.default)(block);
                    yield block.position;
                }
            }
            yield [name, coordsGenerator()];
        }
    }
    *getDistinctBiomeNames() {
        for (const biomeName of this.biomeNamesToBlocks.keys()) {
            yield biomeName;
        }
    }
    *getBiomeNamesToClosestCoords() {
        for (const [name, avlTree] of this
            .biomeNamesToDistanceSortedAVLTreeOfCoords) {
            const closestBiomeKey = avlTree.min();
            (0, assert_1.default)(closestBiomeKey);
            const closestBiomePos = cache_1.AllLoadedBlocksCache.getVec3FromKey(closestBiomeKey);
            yield [name, closestBiomePos];
        }
    }
    *getBiomeNamesToAllCoords() {
        for (const [name, avlTree] of this
            .biomeNamesToDistanceSortedAVLTreeOfCoords) {
            const self = this; // Capture `this` for the generator function
            function* coordsGenerator() {
                for (const biomeKey of avlTree.keys()) {
                    const pos = cache_1.AllLoadedBlocksCache.getVec3FromKey(biomeKey);
                    yield pos;
                }
            }
            yield [name, coordsGenerator()];
        }
    }
    *getDistinctItemNames() {
        for (const itemName of this.itemNamesToItems.keys()) {
            yield itemName;
        }
    }
    *getItemNamesToClosestCoords() {
        for (const [name, avlTree] of this
            .itemsNamesToDistanceSortedAVLTreeOfItems) {
            const closestItemKey = avlTree.min();
            (0, assert_1.default)(closestItemKey);
            const closestItem = this.itemsLookup.get(closestItemKey);
            (0, assert_1.default)(closestItem);
            yield [name, closestItem.entity.position];
        }
    }
    *getItemNamesToAllCoords() {
        for (const [name, avlTree] of this
            .itemsNamesToDistanceSortedAVLTreeOfItems) {
            const self = this; // Capture `this` for the generator function
            function* coordsGenerator() {
                for (const itemKey of avlTree.keys()) {
                    const item = self.itemsLookup.get(itemKey);
                    (0, assert_1.default)(item);
                    yield item.entity.position;
                }
            }
            yield [name, coordsGenerator()];
        }
    }
}
exports.VisibleVicinityContents = VisibleVicinityContents;

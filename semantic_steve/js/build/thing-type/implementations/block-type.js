"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockType = void 0;
const types_1 = require("../../types");
const prismarine_nbt_1 = require("prismarine-nbt");
const block_1 = require("../../utils/block");
class BlockType {
    constructor(bot, name) {
        if (name in bot.registry.blocksByName) {
            this.name = name;
            this.pblock = bot.registry.blocksByName[name];
        }
        else {
            throw new types_1.InvalidThingError(`Invalid block type: ${name}.`);
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
    assessMineabilityWithCurrentTools() {
        const pblock = this.pblock; // new PBlock(this.pblock.id, 0, 0); // Default metadata/stateId
        if (!pblock.diggable) {
            return [false, null];
        }
        const canMine = (itemID) => {
            const pBlockHasNoDrops = !pblock.drops || pblock.drops.length === 0;
            const pBlockHasNoHarvestTools = !pblock.harvestTools;
            if (pBlockHasNoDrops || pBlockHasNoHarvestTools) {
                return (0, block_1.getDigTimeMS)(this.bot, this.pblock.id, itemID) < 100000; // 100 seconds
            }
            else {
                if (itemID === null || !pblock.harvestTools) {
                    return false;
                }
                return (itemID in pblock.harvestTools &&
                    (0, block_1.getDigTimeMS)(this.bot, this.pblock.id, itemID) < 100000 // 100 seconds
                );
            }
        };
        let fastestDigTime = Number.MAX_VALUE;
        let bestTool = undefined;
        for (const item of this.bot.envState.inventory.itemSlots) {
            const itemID = item.type;
            if (canMine(itemID)) {
                const digTime = (0, block_1.getDigTimeMS)(this.bot, this.pblock.id, itemID, item && item.nbt ? (0, prismarine_nbt_1.simplify)(item.nbt).Enchantments : [], this.bot.entity.effects);
                if (digTime < fastestDigTime) {
                    fastestDigTime = digTime;
                    bestTool = item;
                }
            }
        }
        if (bestTool) {
            return [true, bestTool.type];
        }
        else if (canMine(null)) {
            return [true, null]; // If the block can be mined with the hand
        }
        return [false, null]; // No viable tool and block can't be mined w/ hand
    }
    // ================================
    // Implementation of ThingType API
    // ================================
    isVisibleInImmediateSurroundings() {
        for (const blockName of this.bot.envState.surroundings.immediate.visible.getDistinctBlockNames()) {
            if (blockName === this.name) {
                return true;
            }
        }
        return false;
    }
    isVisibleInDistantSurroundings() {
        for (const dir of this.bot.envState.surroundings.distant.values()) {
            for (const blockName of dir.visible.getDistinctBlockNames()) {
                if (blockName === this.name) {
                    return true;
                }
            }
        }
        return false;
    }
    locateNearest() {
        // Try immediate surroundings first
        const immediateResult = this.locateNearestInImmediateSurroundings();
        if (immediateResult) {
            return immediateResult;
        }
        // If not found in immediate surroundings, try distant surroundings
        return this.locateNearestInDistantSurroundings();
    }
    locateNearestInImmediateSurroundings() {
        for (const [name, closestCoords,] of this.bot.envState.surroundings.immediate.visible.getBlockNamesToClosestCoords()) {
            if (name === this.name) {
                return closestCoords.clone();
            }
        }
    }
    locateNearestInDistantSurroundings(direction) {
        // If a specific direction is provided, check only that direction
        if (direction) {
            const vicinity = this.bot.envState.surroundings.distant.get(direction);
            for (const [name, closestCoords,] of vicinity.visible.getBlockNamesToClosestCoords()) {
                if (name === this.name) {
                    return closestCoords.clone();
                }
            }
            return undefined; // Not found in the specified direction
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestOfClosestCoords = undefined;
        let smallestDistance = Infinity;
        for (const dir of directions) {
            const vicinity = this.bot.envState.surroundings.distant.get(dir);
            for (const [name, closestCoords,] of vicinity.visible.getBlockNamesToClosestCoords()) {
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
    isVisibleInImmediateSurroundingsAt(coords) {
        for (const [name, coordsIterable,] of this.bot.envState.surroundings.immediate.visible.getBlockNamesToAllCoords()) {
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
exports.BlockType = BlockType;

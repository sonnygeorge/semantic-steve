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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MineBlocks = void 0;
const skill_1 = require("../skill");
const events_1 = require("events");
const results_1 = require("./results");
const utils_1 = require("./utils");
class MineBlocks extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.isMining = false;
        this.blockToMine = "";
        this.targetQuantity = 0;
        this.currentQuantity = 0;
        this.blockPositions = [];
        this.bestTool = null;
    }
    invoke(block_1) {
        return __awaiter(this, arguments, void 0, function* (block, quantity = 1) {
            this.isMining = true;
            this.blockToMine = block;
            this.targetQuantity = quantity;
            this.currentQuantity = 0;
            this.blockPositions = [];
            try {
                // Check if the block is valid
                if (!this.bot.registry.blocksByName[block]) {
                    this.isMining = false;
                    return this.onResolution(new results_1.MineBlocksResults.InvalidBlock(block));
                }
                // Find blocks of the specified type nearby
                this.blockPositions = (0, utils_1.findBlocksOfType)(this.bot, block, MineBlocks.REACH_DISTANCE);
                if (this.blockPositions.length === 0) {
                    this.isMining = false;
                    return this.onResolution(new results_1.MineBlocksResults.BlockNotInImmediateSurroundings(block));
                }
                // Check if we need a specific tool for this block
                if ((0, utils_1.blockRequiresTool)(this.bot, block)) {
                    this.bestTool = (0, utils_1.getBestToolForBlock)(this.bot, block);
                    if (!this.bestTool) {
                        this.isMining = false;
                        return this.onResolution(new results_1.MineBlocksResults.MissingNecessaryTool(block));
                    }
                }
                // Start mining
                return this.doMining();
            }
            catch (error) {
                console.error(`Error in mineBlocks:`, error);
                this.isMining = false;
                if (this.currentQuantity > 0) {
                    return this.onResolution(new results_1.MineBlocksResults.PartialSuccess(block, this.currentQuantity, quantity));
                }
                return this.onResolution(new results_1.MineBlocksResults.BlockNotInImmediateSurroundings(block));
            }
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isMining) {
                this.isMining = false;
                console.log(`Pausing '${MineBlocks.METADATA.name}'`);
                // Stop current mining activity if possible
                try {
                    this.bot.stopDigging();
                }
                catch (error) {
                    console.error("Error stopping digging:", error);
                }
            }
            return Promise.resolve();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isMining &&
                this.blockToMine &&
                this.currentQuantity < this.targetQuantity) {
                console.log(`Resuming '${MineBlocks.METADATA.name}'`);
                this.isMining = true;
                // Re-find blocks in case the world changed while paused
                this.blockPositions = (0, utils_1.findBlocksOfType)(this.bot, this.blockToMine, MineBlocks.REACH_DISTANCE);
                if (this.blockPositions.length === 0) {
                    this.isMining = false;
                    return this.onResolution(new results_1.MineBlocksResults.PartialSuccess(this.blockToMine, this.currentQuantity, this.targetQuantity));
                }
                return this.doMining();
            }
            return Promise.resolve();
        });
    }
    /**
     * Helper method that performs the actual mining operation
     * Called by both invoke and resume
     */
    doMining() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.isMining || this.blockPositions.length === 0) {
                    return Promise.resolve();
                }
                // Equip the best tool if we have one
                if (this.bestTool) {
                    yield this.bot.equip(this.bestTool, "hand");
                }
                // Mine blocks until we reach the target quantity or run out of blocks
                while (this.currentQuantity < this.targetQuantity &&
                    this.blockPositions.length > 0 &&
                    this.isMining) {
                    const blockToMine = this.blockPositions.shift();
                    // If block is still valid (not air, etc.)
                    if (blockToMine.name === this.blockToMine) {
                        try {
                            // Start digging
                            yield this.bot.dig(blockToMine);
                            // If we get here, the block was successfully mined
                            this.currentQuantity++;
                            // If we need more blocks, update nearby blocks
                            if (this.currentQuantity < this.targetQuantity &&
                                this.blockPositions.length < MineBlocks.REACH_DISTANCE) {
                                const newBlocks = (0, utils_1.findBlocksOfType)(this.bot, this.blockToMine, MineBlocks.REACH_DISTANCE);
                                this.blockPositions = [...newBlocks];
                            }
                        }
                        catch (error) {
                            console.error(`Error mining block:`, error);
                            // Continue to the next block
                        }
                    }
                }
                if (this.bestTool != null) {
                    // allows the item's usage to be updated in the inventory, so we can monitor tool durability usage.
                    yield (0, events_1.once)(this.bot.inventory, "updateSlot");
                } // ignore since no durability change. We don't care about picking up the item.
                // Resolve with the appropriate result
                this.isMining = false;
                if (this.currentQuantity === 0) {
                    return this.onResolution(new results_1.MineBlocksResults.BlockNotInImmediateSurroundings(this.blockToMine));
                }
                else if (this.currentQuantity < this.targetQuantity) {
                    return this.onResolution(new results_1.MineBlocksResults.PartialSuccess(this.blockToMine, this.currentQuantity, this.targetQuantity));
                }
                else {
                    return this.onResolution(new results_1.MineBlocksResults.Success(this.blockToMine, this.currentQuantity));
                }
            }
            catch (error) {
                console.error(`Error in doMining:`, error);
                this.isMining = false;
                if (this.currentQuantity > 0) {
                    return this.onResolution(new results_1.MineBlocksResults.PartialSuccess(this.blockToMine, this.currentQuantity, this.targetQuantity));
                }
                return this.onResolution(new results_1.MineBlocksResults.BlockNotInImmediateSurroundings(this.blockToMine));
            }
        });
    }
}
exports.MineBlocks = MineBlocks;
MineBlocks.TIMEOUT_MS = 20000; // 20 seconds
MineBlocks.REACH_DISTANCE = 5; // MineBlocks.REACH_DISTANCE blocks
MineBlocks.METADATA = {
    name: "mineBlocks",
    signature: "mineBlocks(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Auto-equipping the best tool for the job, attempts to mine the specified
         * quantity of the specified block, assuming the block(s) is/are in the immediate
         * surroundings.
         *
         * NOTE: This skill does not pick up the drops from the mined blocks. Please use
         * 'pickUpItems' to make sure you pick up any drops you may want.
         *
         * @param block - The block to mine.
         * @param quantity - Optional quantity to mine. Defaults to 1.
         */
      `,
};

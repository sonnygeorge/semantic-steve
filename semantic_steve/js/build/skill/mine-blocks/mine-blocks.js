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
exports.MineBlocks = void 0;
const assert_1 = __importDefault(require("assert"));
const skill_1 = require("../skill");
const constants_1 = require("../../constants");
const results_1 = require("./results");
const thing_1 = require("../../thing");
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const pickup_item_1 = require("../pickup-item/pickup-item");
const generic_1 = require("../../utils/generic");
const item_entity_1 = require("../../thing/item-entity");
const constants_2 = require("../../constants");
// TODO: Add optional 'with' (tool) argument
// TODO (someday): Add handling for silk touch
// TODO (someday): Figure out why oak_leaves drops is [] in minecraft-data
class MineBlocks extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.shouldBeDoingStuff = true;
        this.shouldTerminateSubskillWaiting = false;
        this.numBlocksBroken = 0;
        this.numDropPickupsAttempted = 0;
    }
    resolve(result) {
        if (this.quantityOfDropInInventoryAtInvocation &&
            this.blockToMineDrop &&
            this.numBlocksToMine) {
            const numAcquired = this.blockToMineDrop.itemEntity.getTotalCountInInventory() -
                this.quantityOfDropInInventoryAtInvocation;
            if (this.didAcquireExpectedMinDropCount()) {
                result = new results_1.MineBlocksResults.Success(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, this.blockToMineDrop.itemEntity.name, numAcquired);
            }
            else {
                result = new results_1.MineBlocksResults.PartialSuccess(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, this.blockToMineDrop.itemEntity.name, numAcquired, result.message);
            }
        }
        super.resolve(result);
    }
    /**
     * Gets the block to mine drop info if this.blockTypeToMine is defined.
     *
     * NOTE: If we want to change whether we want/pick up a silk-touch drop, this will need
     * to be looked at closer and this whole skill will likely need to take some argument
     * for that.
     */
    get blockToMineDrop() {
        var _a, _b;
        if (!this.blockTypeToMine) {
            return null;
        }
        const blockToMineDrops = this.blockTypeToMine.pblock.drops;
        let minCount = 1;
        let maxCount = 1;
        let itemID = -1;
        if (typeof blockToMineDrops === "number") {
            // PBlock.drops is a number
            itemID = blockToMineDrops;
        }
        else if (Array.isArray(blockToMineDrops) && blockToMineDrops.length > 0) {
            const firstDrop = blockToMineDrops[0];
            if (typeof firstDrop === "number") {
                itemID = firstDrop;
            }
            else if (firstDrop && typeof firstDrop === "object") {
                const drop = firstDrop.drop;
                if (typeof drop === "number") {
                    itemID = drop;
                }
                else if (drop && typeof drop === "object" && "id" in drop) {
                    itemID = drop.id;
                }
                else {
                    throw new Error(`Unexpected Pblock.drops format: ${JSON.stringify(blockToMineDrops)}`);
                }
                minCount = (_a = firstDrop.minCount) !== null && _a !== void 0 ? _a : 1; // Set to one if undefined
                maxCount = (_b = firstDrop.maxCount) !== null && _b !== void 0 ? _b : 1; // Set to one if undefined
            }
        }
        else if (Array.isArray(blockToMineDrops) &&
            blockToMineDrops.length === 0) {
            // PBlock.drops is an empty array
            return null;
        }
        else {
            throw new Error(`Unexpected Pblock.drops format: ${JSON.stringify(blockToMineDrops)}`);
        }
        if (itemID === -1) {
            throw new Error(`Unexpected Pblock.drops format: ${JSON.stringify(blockToMineDrops)}`);
        }
        return {
            minCount: minCount,
            maxCount: maxCount,
            itemEntity: new item_entity_1.ItemEntity(this.bot, undefined, itemID),
        };
    }
    didAcquireExpectedMinDropCount() {
        (0, assert_1.default)(this.blockToMineDrop);
        (0, assert_1.default)(this.numBlocksToMine);
        (0, assert_1.default)(this.quantityOfDropInInventoryAtInvocation);
        const expectedMinDropCount = this.blockToMineDrop.minCount * this.numBlocksToMine;
        const numInInventory = this.blockToMineDrop.itemEntity.getTotalCountInInventory();
        const numAcquired = numInInventory - this.quantityOfDropInInventoryAtInvocation;
        return numAcquired >= expectedMinDropCount;
    }
    resolveAfterSomeMining(partialSuccessReason) {
        (0, assert_1.default)(this.blockTypeToMine);
        (0, assert_1.default)(this.numBlocksToMine);
        this.shouldBeDoingStuff = false;
        if (!this.blockToMineDrop) {
            if (partialSuccessReason) {
                return this.resolve(new results_1.MineBlocksResults.PartialSuccess(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, undefined, 0, partialSuccessReason));
            }
            else {
                return this.resolve(new results_1.MineBlocksResults.Success(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, undefined, 0));
            }
        }
        (0, assert_1.default)(this.quantityOfDropInInventoryAtInvocation);
        const numAcquired = this.blockToMineDrop.itemEntity.getTotalCountInInventory() -
            this.quantityOfDropInInventoryAtInvocation;
        if (this.didAcquireExpectedMinDropCount()) {
            return this.resolve(new results_1.MineBlocksResults.Success(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, this.blockToMineDrop.itemEntity.name, numAcquired));
        }
        else {
            return this.resolve(new results_1.MineBlocksResults.PartialSuccess(this.blockTypeToMine.name, this.numBlocksBroken, this.numBlocksToMine, this.blockToMineDrop.itemEntity.name, numAcquired, partialSuccessReason));
        }
    }
    // =============
    // Mining logic
    // =============
    assessMineabilityandEquipBestTool() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.blockTypeToMine);
            const [canMine, bestToolID] = this.blockTypeToMine.assessCurrentMineability();
            if (!canMine) {
                // NOTE: Reason = 'tool consumed' since we started w/ a viable tool
                this.resolveAfterSomeMining(results_1.MineBlocksPartialSuccessReason.TOOL_CONSUMED);
            }
            // Equip best tool
            if (!this.shouldBeDoingStuff) {
                return;
            }
            if (bestToolID === null) {
                // Best option is to "punch it with fist"
                yield this.bot.unequip("hand");
            }
            else {
                yield this.bot.equip(bestToolID, "hand");
            }
        });
    }
    getDigCoordsAfterPathfindingToNearestBlockToMine() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.blockTypeToMine);
            let nearestPosOfBlockType =
            // TODO: Somehow prefer same y-level and especially avoid digging straight down?
            yield this.blockTypeToMine.locateNearestInImmediateSurroundings();
            if (!nearestPosOfBlockType) {
                const reason = results_1.MineBlocksPartialSuccessReason.NO_MORE_IN_IMMEDIATE_SURROUNDINGS;
                this.resolveAfterSomeMining(reason);
                return null;
            }
            // Attempt to pathfind over if this position is out of reach
            if (nearestPosOfBlockType.distanceTo(this.bot.entity.position) >= constants_1.MAX_MINING_REACH) {
                let pathfindingToBlockWasSuccess = undefined;
                // Callback that sets the pathfindingToBlockWasSuccess variable to reflect
                // whether the pathfinding to block was successful
                const onPathfindToBlockResolution = (_) => __awaiter(this, void 0, void 0, function* () {
                    (0, assert_1.default)(this.activeSubskill);
                    this.activeSubskill = undefined;
                    nearestPosOfBlockType =
                        yield this.blockTypeToMine.locateNearestInImmediateSurroundings();
                    if (nearestPosOfBlockType &&
                        nearestPosOfBlockType.distanceTo(this.bot.entity.position) < constants_1.MAX_MINING_REACH) {
                        pathfindingToBlockWasSuccess = true;
                    }
                    else {
                        pathfindingToBlockWasSuccess = false;
                    }
                });
                // Invoke pathfinding skill
                this.activeSubskill = new pathfind_to_coordinates_1.PathfindToCoordinates(this.bot, onPathfindToBlockResolution);
                yield this.activeSubskill.invoke([
                    nearestPosOfBlockType.x,
                    nearestPosOfBlockType.y,
                    nearestPosOfBlockType.z,
                ]);
                // Wait for pathfindingToBlockWasSuccess to be set
                while (pathfindingToBlockWasSuccess === undefined ||
                    this.shouldTerminateSubskillWaiting) {
                    yield (0, generic_1.asyncSleep)(50); // Check every 50ms
                }
                if (!pathfindingToBlockWasSuccess) {
                    const reason = results_1.MineBlocksPartialSuccessReason.COULD_NOT_PATHFIND_UNTIL_REACHABLE;
                    this.resolveAfterSomeMining(reason);
                    return null;
                }
            }
            // If we are here, we have a reachable block to mine
            return nearestPosOfBlockType;
        });
    }
    attemptDropPickup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.blockToMineDrop) {
                if (!this.shouldBeDoingStuff) {
                    return;
                }
                // Wait for a bit to make sure the item has dropped and settled
                yield (0, generic_1.asyncSleep)(constants_2.BLOCK_DROP_WAIT_MS);
                if (!this.shouldBeDoingStuff) {
                    return;
                }
                let pickupAttemptComplete = false;
                const onPickupItemResolution = (result) => __awaiter(this, void 0, void 0, function* () {
                    (0, assert_1.default)(this.activeSubskill);
                    this.activeSubskill = undefined;
                    pickupAttemptComplete = true;
                });
                // Invoke pickup item skill
                this.activeSubskill = new pickup_item_1.PickupItem(this.bot, onPickupItemResolution);
                yield this.activeSubskill.invoke(this.blockToMineDrop.itemEntity);
                // Wait for pickupWasSuccess to be set
                while (!pickupAttemptComplete || this.shouldTerminateSubskillWaiting) {
                    yield (0, generic_1.asyncSleep)(50); // Check every 50ms
                }
            }
            this.numDropPickupsAttempted++;
        });
    }
    attemptToMineAndPickupDropsOnce() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.blockTypeToMine);
            (0, assert_1.default)(this.numBlocksToMine);
            yield this.assessMineabilityandEquipBestTool();
            if (!this.shouldBeDoingStuff) {
                return;
            }
            const digCoords = yield this.getDigCoordsAfterPathfindingToNearestBlockToMine();
            if (!this.shouldBeDoingStuff) {
                return;
            }
            (0, assert_1.default)(digCoords);
            const block = this.bot.blockAt(digCoords);
            yield this.bot.dig(block);
            this.numBlocksBroken++;
            yield this.attemptDropPickup();
        });
    }
    startOrResumeMining() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.numBlocksToMine !== undefined);
            // If we are resuming from a pause that happened before a drop was picked up
            if (this.numBlocksBroken < this.numDropPickupsAttempted &&
                this.blockToMineDrop &&
                this.blockToMineDrop.itemEntity.isVisibleInImmediateSurroundings()) {
                yield this.attemptDropPickup();
            }
            // Main loop to attempt mining blocks until resolution or pause
            while (this.numDropPickupsAttempted < this.numBlocksToMine) {
                yield this.attemptToMineAndPickupDropsOnce();
                if (!this.shouldBeDoingStuff) {
                    return;
                }
            }
            this.resolveAfterSomeMining();
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(block_1) {
        return __awaiter(this, arguments, void 0, function* (block, quantity = 1) {
            var _a;
            this.status = skill_1.SkillStatus.ACTIVE_RUNNING;
            try {
                this.blockTypeToMine = new thing_1.Block(this.bot, block);
            }
            catch (err) {
                return this.resolve(new results_1.MineBlocksResults.InvalidBlock(block));
            }
            if (!this.blockTypeToMine.isVisibleInImmediateSurroundings()) {
                return this.resolve(new results_1.MineBlocksResults.BlockNotInImmediateSurroundings(block));
            }
            const [canMine, _] = this.blockTypeToMine.assessCurrentMineability();
            if (!canMine) {
                return this.resolve(new results_1.MineBlocksResults.MissingNecessaryTool(block));
            }
            // Prepare state variables before starting mining
            this.numBlocksToMine = quantity;
            this.numBlocksBroken = 0;
            this.numDropPickupsAttempted = 0;
            this.quantityOfDropInInventoryAtInvocation =
                (_a = this.blockToMineDrop) === null || _a === void 0 ? void 0 : _a.itemEntity.getTotalCountInInventory();
            this.shouldBeDoingStuff = true;
            this.shouldTerminateSubskillWaiting = false;
            yield this.startOrResumeMining();
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shouldBeDoingStuff = false;
            if (this.activeSubskill) {
                yield this.activeSubskill.pause();
            }
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shouldBeDoingStuff = true;
            if (this.activeSubskill) {
                // Since, above, we set shouldBeDoingStuff back to true, the mining loop that was
                // awaiting the resolution of this subskill will pick up as if there was no pause.
                yield this.activeSubskill.resume();
            }
            else {
                // Otherwise, the mining loop exited because shouldBeDoingStuff was set to false
                // during pause and we need to start it again.
                yield this.startOrResumeMining();
            }
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shouldBeDoingStuff = false;
            this.shouldTerminateSubskillWaiting = true;
            if (this.activeSubskill) {
                yield this.activeSubskill.stop();
            }
        });
    }
}
exports.MineBlocks = MineBlocks;
MineBlocks.TIMEOUT_MS = 38000; // 38 seconds
MineBlocks.METADATA = {
    name: "mineBlocks",
    signature: "mineBlocks(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Auto-equipping the best tool for the job, mines and gathers the drops from a
         * specified quantity of block, assuming they are visible in the immediate
         * surroundings.
         *
         * TIP: Don't mine too many at a time; prefer small, incremental quantities
         * (e.g. 1-6) in order to avoid timeout issues.
         *
         * @param block - The block to mine.
         * @param quantity - Optional quantity to mine. Defaults to 1.
         */
      `,
};

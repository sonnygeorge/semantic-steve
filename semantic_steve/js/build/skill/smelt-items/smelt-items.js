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
exports.SmeltItems = void 0;
const assert_1 = __importDefault(require("assert"));
const skill_1 = require("../skill");
const results_1 = require("./results");
const item_entity_1 = require("../../thing/item-entity");
const block_1 = require("../../thing/block");
const types_1 = require("../../types");
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const place_block_1 = require("../place-block/place-block");
const generic_1 = require("../../utils/generic");
const results_2 = require("../place-block/results");
const block_2 = require("../../utils/block");
const smelting_1 = require("../../utils/smelting");
// TODO: Possible refactor ideas
// - Waiting on subskill (should terminate, pause, etc.) abstraction that gets inherited from skill
// - Make everything use isWithinInteractionReach() util
// - Skill commonalities: separate validateInputs, setupSkill, doSkill (all doSkills should be idempotent)
//    - this.state.itemToSmelt instead of this.itemToSmelt
//    - charts of how idempotent flows work and make doSkill read like a book
//    - centralize resolves always to clear this.state?
// - At the least, make craft-items methods a little more atomic like in this skill
// - Idempotent "unit-of-action" sequence sort of like state pattern
// (separate functions that take the skill and check its shouldBeDoingStuff flag)
// in a loop that alternates b/w awaiting uoa and checking shouldBeDoingStuff for exit
// E.g.:
// after, [validate_inputs, setup_skill]:
// idempotent_action_sequence = [
//   resolve_if_already_acquired_expected_result, # checks skill.state.already_acquired_expected_result / precon: (assert skill.state is not None)
//   resolve_if_pause_caused_movement_away_from_furnace, # if (skill.state.furnace_with_items and skill.state.furnace_with_items_is_too_far_away) or not (skill.state.at_least_one_furnace_exists_in_inventory or skill.state.furnace_exists_in_immediate_surrounddings), resolve
//   place_furnace_if_needed, # if not skill.state.furnace_with_items and not skill.state.furnace_exists_in_immediate_surrounddings, place from inventory / precon: not skill.state.furnace_with_items_is_too_far_away if skill.state.furnace_with_items else skill.state.at_least_one_furnace_exists_in_inventory
//   pathfind_to_furnace_if_needed, # pathfind to furnace / precon: skill.state.furnace_in_immediate_surrounddings or (skill.state.furnace_with_items and not skill.state.furnace_with_items_is_too_far_away)
//   place_items_in_furnace_if_needed, # ... etc.
//   wait_for_smelting_to_finish,
//   withdraw_all_items_from_furnace,
//   resolve_after_smelting_completes,
// ]
// for action in idempotent_action_sequence:
//   while (should_be_doing_stuff):
//     await action()
//
// This way it has the cleanliness of the state pattern without the boilerplate and need
// to manage transition dynamics/logic--it just always through this idempotent sequence
class SmeltItems extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.shouldBeDoingStuff = false;
        this.shouldTerminateSubskillWaiting = false;
    }
    getNumOfResultItemAcquired() {
        (0, assert_1.default)(this.expectedResultItem);
        (0, assert_1.default)(this.expectedResultItemQuantity);
        (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
        const resultQuantityCurrentlyInInventory = this.expectedResultItem.getTotalCountInInventory();
        return (resultQuantityCurrentlyInInventory -
            this.resultQuantityInInventoryBeforeSmelting);
    }
    hasAcquiredExpectedResult() {
        (0, assert_1.default)(this.expectedResultItem);
        (0, assert_1.default)(this.expectedResultItemQuantity);
        (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
        return this.getNumOfResultItemAcquired() >= this.expectedResultItemQuantity;
    }
    resolveAfterSmelting() {
        (0, assert_1.default)(this.itemToSmelt);
        (0, assert_1.default)(this.quantityToSmelt);
        (0, assert_1.default)(this.expectedResultItem);
        (0, assert_1.default)(this.expectedResultItemQuantity);
        (0, assert_1.default)(this.fuelItem);
        this.shouldBeDoingStuff = false;
        let result = new results_1.SmeltItemsResults.Success();
        if (!this.hasAcquiredExpectedResult()) {
            (0, assert_1.default)(this.fuelItem.getTotalCountInInventory() == 0);
            result = new results_1.SmeltItemsResults.RanOutOfFuelBeforeFullCompletion(this.fuelItem.name);
        }
        this.resolve(result);
    }
    closeFurnaceWindow() {
        if (this.bot.currentWindow) {
            this.bot.closeWindow(this.bot.currentWindow);
            console.log("Closed furnace window");
        }
    }
    withdrawAllItemsFromFurnace(furnace) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Entered withdrawAllItemsFromFurnace");
            (0, assert_1.default)((0, block_2.isWithinInteractionReach)(this.bot, furnace.position));
            const furnaceObj = yield this.bot.openFurnace(furnace);
            if (furnaceObj.fuelItem()) {
                yield furnaceObj.takeFuel();
            }
            if (furnaceObj.inputItem()) {
                yield furnaceObj.takeInput();
            }
            if (furnaceObj.outputItem()) {
                yield furnaceObj.takeOutput();
            }
            this.closeFurnaceWindow();
        });
    }
    putToSmeltItemsIntoFurnace(furnace) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Entered putItemsIntoFurnace");
            (0, assert_1.default)((0, block_2.isWithinInteractionReach)(this.bot, furnace.position));
            (0, assert_1.default)(this.itemToSmelt);
            (0, assert_1.default)(this.quantityToSmelt);
            (0, assert_1.default)(this.fuelItem);
            const furnaceObj = yield this.bot.openFurnace(furnace);
            yield furnaceObj.putInput(this.itemToSmelt.id, null, this.quantityToSmelt);
            this.furnaceWithItems = furnace;
            this.closeFurnaceWindow();
        });
    }
    waitForSmeltingToFinish() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Entered waitForSmeltingToFinish");
            (0, assert_1.default)(this.furnaceWithItems);
            (0, assert_1.default)(this.fuelItem);
            (0, assert_1.default)((0, block_2.isWithinInteractionReach)(this.bot, this.furnaceWithItems.position));
            const furnaceObj = yield this.bot.openFurnace(this.furnaceWithItems);
            // Add fuel until input item has run out (all smelted) or we run out of fuel
            while (furnaceObj.inputItem()) {
                if (!furnaceObj.fuelItem()) {
                    if (this.fuelItem.getTotalCountInInventory() < 1) {
                        break; // No fuel left
                    }
                    try {
                        yield furnaceObj.putFuel(this.fuelItem.id, null, 1);
                    }
                    catch (err) {
                        console.log("Error taking fuel from furnace:", err);
                        // Presumably errored because no fuel left
                        break;
                    }
                    (0, assert_1.default)(furnaceObj.fuelItem());
                    console.log("Added fuel to furnace");
                }
                yield (0, generic_1.asyncSleep)(100);
                if (!this.shouldBeDoingStuff) {
                    this.closeFurnaceWindow();
                    return; // Exit on pause or stop
                }
            }
            this.closeFurnaceWindow();
        });
    }
    pathfindToFurnaceIfNeeded(furnaceCoords) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Entered pathfindToFurnaceIfNeeded");
            if ((0, block_2.isWithinInteractionReach)(this.bot, furnaceCoords)) {
                return; // Already in range
            }
            let furnaceIsInRangeAfterPathfinding = undefined;
            const handlePathfindingResolution = (result) => {
                this.activeSubskill = undefined;
                furnaceIsInRangeAfterPathfinding =
                    result instanceof results_1.SmeltItemsResults.Success;
            };
            this.activeSubskill = new pathfind_to_coordinates_1.PathfindToCoordinates(this.bot, handlePathfindingResolution.bind(this));
            yield this.activeSubskill.invoke(furnaceCoords);
            // Wait for the pathfinding to finish
            while (furnaceIsInRangeAfterPathfinding === undefined ||
                this.shouldTerminateSubskillWaiting) {
                yield (0, generic_1.asyncSleep)(50);
            }
            if (!furnaceIsInRangeAfterPathfinding) {
                this.shouldBeDoingStuff = false;
                const result = new results_1.SmeltItemsResults.FailedToGetCloseEnoughToFurnace(furnaceCoords);
                this.resolve(result);
                return;
            }
        });
    }
    placeFurnace() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Entered placeFurnace");
            let placeFurnaceResult = undefined;
            const handlePlaceFurnaceResolution = (result) => {
                this.activeSubskill = undefined;
                placeFurnaceResult = result;
            };
            this.activeSubskill = new place_block_1.PlaceBlock(this.bot, handlePlaceFurnaceResolution.bind(this));
            yield this.activeSubskill.invoke("furnace");
            // Wait for the placement to finish
            while (placeFurnaceResult === undefined ||
                this.shouldTerminateSubskillWaiting) {
                yield (0, generic_1.asyncSleep)(50);
            }
            const wasSuccess = placeFurnaceResult instanceof results_2.PlaceBlockResults.Success;
            if (!wasSuccess) {
                this.shouldBeDoingStuff = false;
                const result = new results_1.SmeltItemsResults.FurnacePlacementFailed(placeFurnaceResult);
                this.resolve(result);
                return;
            }
        });
    }
    startOrResumeSmelting() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToSmelt);
            (0, assert_1.default)(this.quantityToSmelt);
            (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
            console.log("Entered startOrResumeSmelting");
            if (this.hasAcquiredExpectedResult()) {
                console.log("Already had expected result by the time we entered startOrResumeSmelting");
                // We likely got here from resuming after a pause that occured while awaiting
                // this.withdrawAllItemsFromFurnace() (which put the results into the inventory)
                this.resolveAfterSmelting();
                return;
            }
            if (!this.furnaceWithItems) {
                // Handle case of a having moved away from placed furnace (before inputting items) during a pause
                const furnaceBlockType = new block_1.Block(this.bot, "furnace");
                const furnaceItemType = new item_entity_1.ItemEntity(this.bot, "furnace");
                const furnaceIsInInventory = furnaceItemType.getTotalCountInInventory() > 0;
                let nearestImmediateSurroundingsFurnaceCoords = furnaceBlockType.locateNearestInImmediateSurroundings();
                if (!nearestImmediateSurroundingsFurnaceCoords && !furnaceIsInInventory) {
                    // No furnace available
                    this.shouldBeDoingStuff = false;
                    this.resolve(new results_1.SmeltItemsResults.FurnaceNoLongerInImmediateSurroundings());
                    return;
                }
                // Place a furnace if none in immediate surroundings
                if (!nearestImmediateSurroundingsFurnaceCoords && furnaceIsInInventory) {
                    yield this.placeFurnace();
                    console.log("Placed furnace");
                    if (!this.shouldBeDoingStuff) {
                        return; // Exit on pause or stop
                    }
                    nearestImmediateSurroundingsFurnaceCoords =
                        furnaceBlockType.locateNearestInImmediateSurroundings();
                }
                (0, assert_1.default)(nearestImmediateSurroundingsFurnaceCoords); // Should always be set by now
                // Pathfind to the furnace if not reachable
                yield this.pathfindToFurnaceIfNeeded(nearestImmediateSurroundingsFurnaceCoords);
                console.log("Finished pathfinding to furnace if needed");
                if (!this.shouldBeDoingStuff) {
                    return; // Exit on pause or stop
                }
                // Input items into the furnace
                const furnace = this.bot.blockAt(nearestImmediateSurroundingsFurnaceCoords);
                (0, assert_1.default)(furnace);
                yield this.withdrawAllItemsFromFurnace(furnace);
                if (!this.shouldBeDoingStuff) {
                    return; // Exit on pause or stop
                }
                yield this.putToSmeltItemsIntoFurnace(furnace);
                if (!this.shouldBeDoingStuff) {
                    return; // Exit on pause or stop
                }
            }
            else {
                (0, assert_1.default)(this.furnaceWithItems);
                yield this.pathfindToFurnaceIfNeeded(this.furnaceWithItems.position);
                if (!this.shouldBeDoingStuff) {
                    return; // Exit on pause or stop
                }
            }
            (0, assert_1.default)(this.furnaceWithItems);
            yield this.waitForSmeltingToFinish();
            console.log("Finished waiting for smelting to finish");
            if (!this.shouldBeDoingStuff) {
                return; // Exit on pause or stop
            }
            yield this.withdrawAllItemsFromFurnace(this.furnaceWithItems);
            this.furnaceWithItems = undefined;
            if (!this.shouldBeDoingStuff) {
                return; // Exit on pause or stop
            }
            this.resolveAfterSmelting();
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(item_1, withFuelItem_1) {
        return __awaiter(this, arguments, void 0, function* (item, withFuelItem, quantityToSmelt = 1) {
            if (typeof item === "string") {
                // Validate the item string
                try {
                    this.itemToSmelt = new item_entity_1.ItemEntity(this.bot, item);
                }
                catch (err) {
                    if (err instanceof types_1.InvalidThingError) {
                        const result = new results_1.SmeltItemsResults.InvalidItem(item);
                        this.resolve(result);
                        return;
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
                this.itemToSmelt = item;
            }
            (0, assert_1.default)(this.itemToSmelt);
            // Validate the fuel item string
            if (typeof withFuelItem === "string") {
                try {
                    this.fuelItem = new item_entity_1.ItemEntity(this.bot, withFuelItem);
                }
                catch (err) {
                    if (err instanceof types_1.InvalidThingError) {
                        const result = new results_1.SmeltItemsResults.InvalidFuelItem(withFuelItem);
                        this.resolve(result);
                        return;
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
                this.fuelItem = withFuelItem;
            }
            (0, assert_1.default)(this.fuelItem);
            // Check if the item is smeltable
            const expectedResultItemName = (0, smelting_1.getSmeltingProductName)(this.itemToSmelt.name);
            if (!expectedResultItemName) {
                this.resolve(new results_1.SmeltItemsResults.NonSmeltableItem(this.itemToSmelt.name));
                return;
            }
            this.expectedResultItem = new item_entity_1.ItemEntity(this.bot, expectedResultItemName);
            this.expectedResultItemQuantity = quantityToSmelt; // Always 1:1 in Minecraft
            // Check if the fuel item is usable as fuel
            if (!(0, smelting_1.isFuel)(this.fuelItem.name)) {
                this.resolve(new results_1.SmeltItemsResults.FuelItemNotUsableAsFuel(this.fuelItem.name));
                return;
            }
            if (quantityToSmelt > 64) {
                this.resolve(new results_1.SmeltItemsResults.CannotSmeltMoreThan64AtATime());
                return;
            }
            // Check if a furnace is available
            const furnaceIsAvailable = () => {
                const furnaceItemType = new item_entity_1.ItemEntity(this.bot, "furnace");
                const furnaceBlockType = new block_1.Block(this.bot, "furnace");
                return (furnaceBlockType.isVisibleInImmediateSurroundings() ||
                    furnaceItemType.getTotalCountInInventory() > 0);
            };
            if (!furnaceIsAvailable()) {
                this.resolve(new results_1.SmeltItemsResults.NoFurnaceAvailable(this.itemToSmelt.name));
                return;
            }
            // Check if we have enough of the item to smelt
            const itemCount = this.itemToSmelt.getTotalCountInInventory();
            if (itemCount < quantityToSmelt) {
                this.resolve(new results_1.SmeltItemsResults.InsufficientToSmeltItems(quantityToSmelt, this.itemToSmelt.name));
                return;
            }
            this.fuelItem.getTotalCountInInventory();
            if (this.fuelItem.getTotalCountInInventory() < 1) {
                this.resolve(new results_1.SmeltItemsResults.FuelItemNotInventory(this.fuelItem, this.itemToSmelt.name));
                return;
            }
            this.quantityToSmelt = quantityToSmelt;
            this.resultQuantityInInventoryBeforeSmelting =
                this.expectedResultItem.getTotalCountInInventory();
            this.furnaceWithItems = undefined;
            this.shouldBeDoingStuff = true;
            this.startOrResumeSmelting();
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToSmelt);
            (0, assert_1.default)(this.quantityToSmelt);
            (0, assert_1.default)(this.fuelItem);
            (0, assert_1.default)(this.expectedResultItem);
            (0, assert_1.default)(this.expectedResultItemQuantity);
            (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
            this.shouldBeDoingStuff = false;
            if (this.activeSubskill) {
                yield this.activeSubskill.pause();
            }
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToSmelt);
            (0, assert_1.default)(this.quantityToSmelt);
            (0, assert_1.default)(this.fuelItem);
            (0, assert_1.default)(this.expectedResultItem);
            (0, assert_1.default)(this.expectedResultItemQuantity);
            (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
            this.shouldBeDoingStuff = true;
            if (this.activeSubskill) {
                // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
                yield this.activeSubskill.resume();
            }
            else {
                // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
                this.startOrResumeSmelting();
            }
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToSmelt);
            (0, assert_1.default)(this.quantityToSmelt);
            (0, assert_1.default)(this.fuelItem);
            (0, assert_1.default)(this.expectedResultItem);
            (0, assert_1.default)(this.expectedResultItemQuantity);
            (0, assert_1.default)(this.resultQuantityInInventoryBeforeSmelting !== undefined);
            this.shouldBeDoingStuff = false;
            this.shouldTerminateSubskillWaiting = true;
            if (this.activeSubskill) {
                yield this.activeSubskill.stop();
            }
        });
    }
}
exports.SmeltItems = SmeltItems;
SmeltItems.TIMEOUT_MS = 90000; // 90 seconds
SmeltItems.METADATA = {
    name: "smeltItems",
    signature: "smeltItems(item: string, withFuelItem: string, quantityToSmelt: number = 1)",
    docstring: `
        /**
         * Smelts one or more of an item, assuming a furnace is either in inventory or in
         * the immediate surroundings.
         *
         * TIP: Do not call this function with very high quantities that will take a long
         * time to smelt and likely result in a timeout. Instead, prefer smelting large
         * quantities in smaller incremental batches.
         *
         * @param item - The item to smelt.
         * @param withFuelItem - The fuel item to use (e.g., coal).
         * @param quantityToSmelt - The quantity to smelt. Defaults to 1.
         */
      `,
};

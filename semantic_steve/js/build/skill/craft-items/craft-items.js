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
exports.CraftItems = void 0;
const assert_1 = __importDefault(require("assert"));
const skill_1 = require("../skill");
const results_1 = require("./results");
const item_entity_1 = require("../../thing/item-entity");
const block_1 = require("../../thing/block");
const types_1 = require("../../types");
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const place_block_1 = require("../place-block/place-block");
const generic_1 = require("../../utils/generic");
const constants_1 = require("../../constants");
const results_2 = require("../place-block/results");
// TODO: Resolve w/ a failure result if there is no space in the inventory for the crafted
// items to be received in the inventory.
class CraftItems extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.shouldBeDoingStuff = false;
        this.shouldTerminateSubskillWaiting = false;
    }
    get itemDifferentialSinceInvoke() {
        (0, assert_1.default)(this.itemToCraft);
        (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
        const quantityInInventory = this.itemToCraft.getTotalCountInInventory();
        return quantityInInventory - this.quantityInInventoryBeforeCrafting;
    }
    botCraft(table) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToCraft);
            (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
            (0, assert_1.default)(this.selectedRecipe);
            (0, assert_1.default)(this.quantityToCraft);
            (0, assert_1.default)(this.useCraftingTable !== undefined);
            if (!this.shouldBeDoingStuff) {
                // Exit on pause or stop
                return;
            }
            const quantityOfRecipe = this.quantityToCraft / this.selectedRecipe.result.count;
            yield this.bot.craft(this.selectedRecipe, quantityOfRecipe, table);
            if (!this.shouldBeDoingStuff) {
                // Exit on pause or stop
                return;
            }
            while (this.itemDifferentialSinceInvoke < this.quantityToCraft) {
                // Wait for the items to register as being in the bot's inventory
                yield (0, generic_1.asyncSleep)(constants_1.CRAFTING_WAIT_MS);
                if (!this.shouldBeDoingStuff) {
                    // Exit on pause or stop
                    return;
                }
            }
            this.shouldBeDoingStuff = false;
            const result = new results_1.CraftItemsResults.Success(this.itemToCraft.name, this.quantityToCraft);
            this.resolve(result);
            return;
        });
    }
    startOrResumeCrafting() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToCraft);
            (0, assert_1.default)(this.quantityToCraft);
            (0, assert_1.default)(this.selectedRecipe);
            (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
            (0, assert_1.default)(this.useCraftingTable !== undefined);
            if (this.itemDifferentialSinceInvoke >= this.quantityToCraft) {
                // We've acquired the expected amount of the item to craft...
                // ...almost certainly from a pause that occured while awaiting bot.craft,
                // or asyncSleep(CRAFTING_WAIT_MS), causing this.shouldBeCrafting to be set to false,
                // false, and preventing resolution, which is why, after resume, we end up here.
                this.shouldBeDoingStuff = false;
                const result = new results_1.CraftItemsResults.Success(this.itemToCraft.name, this.quantityToCraft);
                this.resolve(result);
                return;
            }
            if (!this.useCraftingTable) {
                return yield this.botCraft();
            }
            // Crafting table case
            (0, assert_1.default)(this.useCraftingTable);
            const craftingTableBlockType = new block_1.Block(this.bot, "crafting_table");
            const craftingTableItemType = new item_entity_1.ItemEntity(this.bot, "crafting_table");
            const craftingTableIsInInventory = craftingTableItemType.getTotalCountInInventory() > 0;
            let nearestImmediateSurroundingsTableCoords = craftingTableBlockType.locateNearestInImmediateSurroundings();
            if (!nearestImmediateSurroundingsTableCoords &&
                !craftingTableIsInInventory) {
                // The only reason this could happen is if, during a pause, the bot moved away
                // from the crafting table that this skill placed (removing it from the inventory)
                this.shouldBeDoingStuff = false;
                this.resolve(new results_1.CraftItemsResults.TableNoLongerInImmediateSurroundings());
                return;
            }
            // Place the crafting table if necessary
            if (!nearestImmediateSurroundingsTableCoords &&
                craftingTableIsInInventory) {
                let placeCraftingTableResult = undefined;
                const handlePlaceCraftingTableResolution = (result) => {
                    this.activeSubskill = undefined;
                    placeCraftingTableResult = result;
                };
                this.activeSubskill = new place_block_1.PlaceBlock(this.bot, handlePlaceCraftingTableResolution.bind(this));
                yield this.activeSubskill.invoke(craftingTableBlockType);
                while (placeCraftingTableResult === undefined ||
                    this.shouldTerminateSubskillWaiting) {
                    yield (0, generic_1.asyncSleep)(50);
                }
                const wasSuccess = placeCraftingTableResult instanceof
                    results_2.PlaceBlockResults.Success;
                if (!wasSuccess) {
                    this.shouldBeDoingStuff = false;
                    const result = new results_1.CraftItemsResults.CraftingTablePlacementFailed(placeCraftingTableResult);
                    this.resolve(result);
                    return;
                }
                if (!this.shouldBeDoingStuff) {
                    // Exit on pause or stop
                    return;
                }
                nearestImmediateSurroundingsTableCoords =
                    craftingTableBlockType.locateNearestInImmediateSurroundings();
            }
            (0, assert_1.default)(nearestImmediateSurroundingsTableCoords); // Should always be set by now
            const tableIsReachable = () => {
                const eyePosition = this.bot.entity.position.offset(0, constants_1.BOT_EYE_HEIGHT, 0);
                nearestImmediateSurroundingsTableCoords =
                    craftingTableBlockType.locateNearestInImmediateSurroundings();
                (0, assert_1.default)(nearestImmediateSurroundingsTableCoords);
                const distanceToCraftingTable = eyePosition.distanceTo(nearestImmediateSurroundingsTableCoords);
                return distanceToCraftingTable <= constants_1.MAX_PLACEMENT_REACH;
            };
            if (!tableIsReachable()) {
                // Pathfind to the crafting table
                let tableIsInRangeAfterPathfinding = undefined;
                const handlePathfindingResolution = (result) => {
                    this.activeSubskill = undefined;
                    tableIsInRangeAfterPathfinding = tableIsReachable();
                };
                this.activeSubskill = new pathfind_to_coordinates_1.PathfindToCoordinates(this.bot, handlePathfindingResolution.bind(this));
                yield this.activeSubskill.invoke(nearestImmediateSurroundingsTableCoords);
                while (tableIsInRangeAfterPathfinding === undefined ||
                    this.shouldTerminateSubskillWaiting) {
                    yield (0, generic_1.asyncSleep)(50);
                }
                if (!tableIsInRangeAfterPathfinding) {
                    this.shouldBeDoingStuff = false;
                    const result = new results_1.CraftItemsResults.FailedToGetCloseEnoughToTable(nearestImmediateSurroundingsTableCoords);
                    this.resolve(result);
                    return;
                }
                if (!this.shouldBeDoingStuff) {
                    // Exit on pause or stop
                    return;
                }
            }
            (0, assert_1.default)(tableIsReachable());
            // Finally, we craft the item
            const table = this.bot.blockAt(nearestImmediateSurroundingsTableCoords);
            (0, assert_1.default)(table);
            return yield this.botCraft(table);
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(item_1) {
        return __awaiter(this, arguments, void 0, function* (item, quantity = 1) {
            if (typeof item === "string") {
                // Validate the item string
                try {
                    this.itemToCraft = new item_entity_1.ItemEntity(this.bot, item);
                }
                catch (err) {
                    if (err instanceof types_1.InvalidThingError) {
                        const result = new results_1.CraftItemsResults.InvalidItem(item);
                        this.resolve(result);
                        return;
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
                this.itemToCraft = item;
            }
            (0, assert_1.default)(this.itemToCraft); // TS compiler doesn't know this despite always being true
            const tableRecipes = this.bot.recipesAll(this.itemToCraft.id, null, true);
            const nonTableRecipes = this.bot.recipesAll(this.itemToCraft.id, null, false);
            const allRecipes = tableRecipes.concat(nonTableRecipes);
            // Check if the item is craftable generally (any recipes exist)
            if (allRecipes.length === 0) {
                this.resolve(new results_1.CraftItemsResults.NonCraftableItem(this.itemToCraft.name));
                return;
            }
            // Check if the item requires a crafting table but none are available
            const craftingTableIsAvailable = () => {
                const craftingTableItemType = new item_entity_1.ItemEntity(this.bot, "crafting_table");
                const craftingTableBlockType = new block_1.Block(this.bot, "crafting_table");
                return (craftingTableBlockType.isVisibleInImmediateSurroundings() ||
                    craftingTableItemType.getTotalCountInInventory() > 0);
            };
            const requiresCraftingTable = nonTableRecipes.length === 0;
            if (requiresCraftingTable && !craftingTableIsAvailable()) {
                this.resolve(new results_1.CraftItemsResults.NoCraftingTable(this.itemToCraft.name));
                return;
            }
            // Get feasible recipes for out desired minimum quantity
            const recipes = this.bot.recipesFor(this.itemToCraft.id, null, quantity, // Minimum resulting quantity
            true);
            let lastFeasibleNonTableRecipe = undefined;
            let lastFeasibleTableRecipe = undefined;
            for (const recipe of recipes) {
                // NOTE: this.bot.recipesFor() only returns recipes:
                // 1. that produce at least the requested quantity of items
                // 2. for which the bot has sufficient ingredients
                const isFeasibleNonTableRecipe = !recipe.requiresTable;
                const isFeasibleTableRecipe = recipe.requiresTable && craftingTableIsAvailable();
                if (isFeasibleNonTableRecipe) {
                    lastFeasibleNonTableRecipe = recipe;
                }
                if (isFeasibleTableRecipe) {
                    lastFeasibleTableRecipe = recipe;
                }
            }
            // Select the recipe (preferring to not use a crafting table if not required)
            if (lastFeasibleNonTableRecipe) {
                this.selectedRecipe = lastFeasibleNonTableRecipe;
                this.useCraftingTable = false;
            }
            else if (lastFeasibleTableRecipe) {
                this.selectedRecipe = lastFeasibleTableRecipe;
                this.useCraftingTable = true;
            }
            else {
                // Since we already determined:
                // 1. that the item is craftable
                // 2. that we have a crafting table if needed
                // Therefore, the only reason recipesFor would return an empty array is if the bot
                // doesn't have the required ingredients in its inventory.
                this.resolve(new results_1.CraftItemsResults.InsufficientRecipeIngredients(this.itemToCraft.name, quantity));
                return;
            }
            // NOTE: quantityToCraft can/should be larger than the requested quantity if a recipe
            // produces only multiples of the resulting item (e.g. 4 or 8) and the requested
            // quantity is not a multiple of that number.
            this.quantityToCraft =
                Math.ceil(quantity / this.selectedRecipe.result.count) *
                    this.selectedRecipe.result.count;
            this.shouldBeDoingStuff = true;
            this.quantityInInventoryBeforeCrafting =
                this.itemToCraft.getTotalCountInInventory();
            this.startOrResumeCrafting();
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToCraft);
            (0, assert_1.default)(this.quantityToCraft);
            (0, assert_1.default)(this.selectedRecipe);
            (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
            (0, assert_1.default)(this.useCraftingTable !== undefined);
            this.shouldBeDoingStuff = false;
            if (this.activeSubskill) {
                yield this.activeSubskill.pause();
            }
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToCraft);
            (0, assert_1.default)(this.quantityToCraft);
            (0, assert_1.default)(this.selectedRecipe);
            (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
            (0, assert_1.default)(this.useCraftingTable !== undefined);
            this.shouldBeDoingStuff = true;
            if (this.activeSubskill) {
                // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
                yield this.activeSubskill.resume();
            }
            else {
                // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
                this.startOrResumeCrafting();
            }
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemToCraft);
            (0, assert_1.default)(this.quantityToCraft);
            (0, assert_1.default)(this.selectedRecipe);
            (0, assert_1.default)(this.quantityInInventoryBeforeCrafting !== undefined);
            (0, assert_1.default)(this.useCraftingTable !== undefined);
            this.shouldBeDoingStuff = false;
            this.shouldTerminateSubskillWaiting = true;
            if (this.activeSubskill) {
                yield this.activeSubskill.stop();
            }
        });
    }
}
exports.CraftItems = CraftItems;
CraftItems.TIMEOUT_MS = 19000; // 19 seconds
CraftItems.METADATA = {
    name: "craftItems",
    signature: "craftItems(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Crafts one or more of an item, assuming a crafting table (if necessary for the
         * recipe) is either in inventory or in the immediate surroundings.
         * @param item - The item to craft.
         * @param quantity - Optional quantity to craft. Defaults to 1.
         */
      `,
};

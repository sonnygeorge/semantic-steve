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
exports.CraftItems = void 0;
const skill_1 = require("../skill");
const results_1 = require("./results");
const utils_1 = require("./utils");
class CraftItems extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.isCrafting = false;
        this.craftItem = "";
        this.wantedItemQuantity = 0;
        this.craftCount = 0;
        this.selectedRecipe = null;
        this.craftingTableRequired = false;
    }
    invoke(item_1) {
        return __awaiter(this, arguments, void 0, function* (item, quantity = 1) {
            var _a;
            this.isCrafting = true;
            this.craftItem = item;
            this.wantedItemQuantity = quantity;
            try {
                // Normalize item name
                const normalizedItem = item;
                const id = (_a = this.bot.registry.itemsByName[normalizedItem]) === null || _a === void 0 ? void 0 : _a.id;
                if (!id) {
                    this.isCrafting = false;
                    return this.onResolution(new results_1.CraftItemsResults.InvalidItem(item));
                }
                // Get all available recipes from the bot
                const recipes = this.bot.recipesFor(id, null, quantity, true);
                if (recipes.length === 0) {
                    this.isCrafting = false;
                    return this.onResolution(new results_1.CraftItemsResults.InvalidItem(item));
                }
                // Attempt to find a recipe we can craft with our current inventory
                this.craftingTableRequired = false;
                this.selectedRecipe = null;
                for (const recipe of recipes) {
                    if (recipe.requiresTable) {
                        this.craftingTableRequired = true;
                    }
                    // Check if we have enough ingredients for this recipe
                    // this will have to use my plugin.
                    // const canCraft = this.bot.canCraft(recipe);
                    // if (canCraft) {
                    this.selectedRecipe = recipe;
                    //   break;
                    // }
                }
                // If no recipe was found that we can craft
                if (!this.selectedRecipe) {
                    this.isCrafting = false;
                    return this.onResolution(new results_1.CraftItemsResults.InsufficientRecipeIngredients(item, quantity));
                }
                // If crafting table is required, check if we have one or can access one
                if (this.craftingTableRequired) {
                    const craftingTable = yield this.findCraftingTable();
                    if (!craftingTable) {
                        this.isCrafting = false;
                        return this.onResolution(new results_1.CraftItemsResults.NoCraftingTable(item));
                    }
                }
                this.craftCount = Math.ceil(this.wantedItemQuantity / this.selectedRecipe.result.count);
                // Perform the actual crafting operation
                return this.doCrafting();
            }
            catch (error) {
                // Handle unexpected errors
                console.error(`Error crafting ${item}:`, error);
                this.isCrafting = false;
                return this.onResolution(new results_1.CraftItemsResults.InsufficientRecipeIngredients(item, quantity));
            }
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isCrafting = false;
            console.log("Pausing crafting operation...");
            return Promise.resolve();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.craftItem && this.selectedRecipe) {
                this.isCrafting = true;
                console.log("Resuming crafting operation...");
                return this.doCrafting();
            }
            return Promise.resolve();
        });
    }
    /**
     * Helper method that performs the actual crafting operation
     * Called by both invoke and resume
     */
    doCrafting() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.isCrafting || !this.selectedRecipe) {
                    return Promise.resolve();
                }
                // If a crafting table is required, find one
                if (this.craftingTableRequired) {
                    const craftingTable = yield this.findCraftingTable();
                    if (craftingTable) {
                        yield this.bot.craft(this.selectedRecipe, this.craftCount, craftingTable);
                    }
                    else {
                        throw new Error("Crafting table required but not found");
                    }
                }
                else {
                    // Otherwise craft without a crafting table
                    yield this.bot.craft(this.selectedRecipe, this.craftCount);
                }
                // Successfully crafted all requested items
                this.isCrafting = false;
                return this.onResolution(new results_1.CraftItemsResults.Success(this.craftItem, this.wantedItemQuantity));
            }
            catch (error) {
                // Handle unexpected errors
                console.error(`Error in doCrafting:`, error);
                this.isCrafting = false;
                return this.onResolution(new results_1.CraftItemsResults.InsufficientRecipeIngredients(this.craftItem, this.wantedItemQuantity));
            }
        });
    }
    /**
     * Finds a crafting table in the bot's inventory or nearby in the world
     * @returns The crafting table block if found, null otherwise
     */
    findCraftingTable() {
        return __awaiter(this, void 0, void 0, function* () {
            // First check if we have a crafting table in our inventory
            const craftingTableItem = (0, utils_1.hasCraftingTableInInventory)(this.bot);
            if (craftingTableItem) {
                // If we have a crafting table in inventory, try to place it
                const placed = yield (0, utils_1.placeCraftingTable)(this.bot);
                if (placed) {
                    return (0, utils_1.findNearbyCraftingTable)(this.bot);
                }
            }
            // If we don't have one in inventory or couldn't place it, look for one nearby
            return (0, utils_1.findNearbyCraftingTable)(this.bot);
        });
    }
}
exports.CraftItems = CraftItems;
CraftItems.TIMEOUT_MS = 10000; // 10 seconds
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

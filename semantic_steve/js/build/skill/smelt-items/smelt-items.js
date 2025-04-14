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
exports.SmeltItems = void 0;
const skill_1 = require("../skill");
const results_1 = require("./results");
class SmeltItems extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.isSmelting = false;
        this.itemToSmelt = "";
        this.fuelItem = "";
        this.targetQuantity = 0;
        this.smeltedQuantity = 0;
        this.resultItem = "";
        this.resultQuantity = 0;
        this.furnaceBlock = null;
        this.furnaceObj = null;
    }
    invoke(item_1, fuelItem_1) {
        return __awaiter(this, arguments, void 0, function* (item, fuelItem, quantity = 1) {
            this.isSmelting = true;
            this.itemToSmelt = item;
            this.fuelItem = fuelItem || "";
            this.targetQuantity = quantity;
            this.smeltedQuantity = 0;
            this.resultQuantity = 0;
            this.resultItem = "";
            try {
                // Check if the item is valid and in inventory
                const smeltItem = this.getItemFromInventory(item);
                if (!smeltItem) {
                    this.isSmelting = false;
                    return this.onResolution(new results_1.SmeltItemsResults.InvalidItem(item));
                }
                // Get or infer fuel item
                const fuelItemObj = this.getFuelItem(fuelItem);
                if (!fuelItemObj) {
                    this.isSmelting = false;
                    if (fuelItem) {
                        return this.onResolution(new results_1.SmeltItemsResults.SpecifiedFuelItemNotInInventory(fuelItem, quantity));
                    }
                    else {
                        return this.onResolution(new results_1.SmeltItemsResults.FuelItemNotInInventory(item));
                    }
                }
                // Remember the fuel item name
                this.fuelItem = fuelItemObj.name;
                // Find a furnace
                this.furnaceBlock = this.findNearbyFurnace();
                if (!this.furnaceBlock) {
                    this.isSmelting = false;
                    return this.onResolution(new results_1.SmeltItemsResults.NoFurnaceEtc(item));
                }
                // Perform the actual smelting
                yield this.doSmelting(smeltItem, fuelItemObj);
            }
            catch (error) {
                console.error(`Error in smeltItems:`, error);
                this.handleError(error);
            }
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isSmelting) {
                this.isSmelting = false;
                console.log(`Pausing '${SmeltItems.metadata.name}'`);
                if (this.furnaceObj && this.bot.currentWindow) {
                    yield this.bot.closeWindow(this.bot.currentWindow);
                }
            }
            return Promise.resolve();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isSmelting &&
                this.itemToSmelt &&
                this.smeltedQuantity < this.targetQuantity) {
                console.log(`Resuming '${SmeltItems.metadata.name}'`);
                const smeltItem = this.getItemFromInventory(this.itemToSmelt);
                if (!smeltItem) {
                    return this.onResolution(new results_1.SmeltItemsResults.InvalidItem(this.itemToSmelt));
                }
                const fuelItem = this.getItemFromInventory(this.fuelItem);
                if (!fuelItem) {
                    return this.onResolution(new results_1.SmeltItemsResults.FuelItemNotInInventory(this.itemToSmelt));
                }
                this.furnaceBlock = this.findNearbyFurnace();
                if (!this.furnaceBlock) {
                    return this.onResolution(new results_1.SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
                }
                this.isSmelting = true;
                yield this.doSmelting(smeltItem, fuelItem);
            }
            return Promise.resolve();
        });
    }
    doSmelting(itemToSmelt, fuelItem) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Open the furnace
                this.furnaceObj = yield this.bot.openFurnace(this.furnaceBlock);
                // Add fuel and items
                const remainingQuantity = this.targetQuantity - this.smeltedQuantity;
                const quantityToSmelt = Math.min(remainingQuantity, itemToSmelt.count);
                // Put fuel in the furnace
                try {
                    yield this.furnaceObj.putFuel(fuelItem.type, null, 1);
                }
                catch (error) {
                    console.error("Error putting fuel in furnace:", error);
                    throw new Error(`Failed to put fuel (${fuelItem.name}) in furnace: ${error.message}`);
                }
                // Put input in the furnace
                try {
                    yield this.furnaceObj.putInput(itemToSmelt.type, null, quantityToSmelt);
                }
                catch (error) {
                    console.error("Error putting input in furnace:", error);
                    throw new Error(`Failed to put input (${itemToSmelt.name}) in furnace: ${error.message}`);
                }
                // Monitor smelting until complete
                let smeltingComplete = false;
                while (this.isSmelting && !smeltingComplete) {
                    const outputItem = this.furnaceObj.outputItem();
                    if (outputItem) {
                        try {
                            yield this.furnaceObj.takeOutput();
                            this.smeltedQuantity += outputItem.count;
                            this.resultQuantity += outputItem.count;
                            // Get the name of the result item
                            this.resultItem = outputItem.name;
                        }
                        catch (error) {
                            console.error("Error taking output from furnace:", error);
                            throw new Error(`Failed to take output from furnace: ${error.message}`);
                        }
                    }
                    // Check if we're done
                    if (this.smeltedQuantity >= this.targetQuantity ||
                        (!this.furnaceObj.inputItem() && !outputItem)) {
                        smeltingComplete = true;
                    }
                    else {
                        yield new Promise((resolve) => setTimeout(resolve, 500));
                    }
                }
                // Close the furnace
                yield this.closeFurnace();
                // Return the result
                this.isSmelting = false;
                if (this.smeltedQuantity >= this.targetQuantity) {
                    this.onResolution(new results_1.SmeltItemsResults.Success(this.itemToSmelt, this.smeltedQuantity, this.resultItem, this.resultQuantity));
                }
                else if (this.smeltedQuantity > 0) {
                    this.onResolution(new results_1.SmeltItemsResults.PartialSuccess(this.itemToSmelt, this.smeltedQuantity, this.targetQuantity, this.resultItem, this.resultQuantity));
                }
                else {
                    this.onResolution(new results_1.SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
                }
            }
            catch (error) {
                console.error("Error in smelting process:", error);
                yield this.closeFurnace();
                this.handleError(error);
            }
        });
    }
    closeFurnace() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.furnaceObj && this.bot.currentWindow) {
                try {
                    yield this.bot.closeWindow(this.bot.currentWindow);
                }
                catch (e) {
                    console.error("Error closing furnace:", e);
                    // Ignore errors when closing
                }
            }
        });
    }
    handleError(error) {
        this.isSmelting = false;
        console.error("SmeltItems error:", error);
        // Try to give a more specific error message based on the error
        if (error.message && error.message.includes("ItemType")) {
            console.error("Invalid ItemType error - likely incorrect item reference");
        }
        if (this.smeltedQuantity > 0) {
            this.onResolution(new results_1.SmeltItemsResults.PartialSuccess(this.itemToSmelt, this.smeltedQuantity, this.targetQuantity, this.resultItem || "unknown", this.resultQuantity));
        }
        else {
            this.onResolution(new results_1.SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
        }
    }
    getItemFromInventory(itemName) {
        return this.bot.inventory.items().find((item) => item.name === itemName);
    }
    getFuelItem(specifiedFuel) {
        // Use specified fuel if provided
        if (specifiedFuel) {
            return this.getItemFromInventory(specifiedFuel);
        }
        // Find suitable fuel
        return this.findSuitableFuel();
    }
    // This will be implemented externally
    findSuitableFuel() {
        return this.bot.inventory
            .items()
            .find((item) => ["coal", "charcoal", "coal_block"].includes(item.name) ||
            item.name.includes("wood") ||
            item.name.includes("log"));
    }
    // This will be implemented externally
    findNearbyFurnace() {
        const furnaceTypes = ["furnace", "blast_furnace", "smoker"];
        const furnacePositions = this.bot.findBlocks({
            matching: (block) => furnaceTypes.includes(block.name),
            useExtraInfo: true,
            maxDistance: 4,
            count: 1,
        });
        if (furnacePositions.length === 0)
            return null;
        return this.bot.blockAt(furnacePositions[0]);
    }
}
exports.SmeltItems = SmeltItems;
SmeltItems.metadata = {
    name: "smeltItems",
    signature: "smeltItems(item: string, fuelItem?: string, quantity: number = 1)",
    docstring: `
        /**
         * Smelts items, assuming a furnace (or, e.g., blast furnace or smoker) is in
         * inventory or in the immediate surroundings.
         * @param item - The item to smelt.
         * @param fuelItem - Optional fuel item to use (e.g., coal). Defaults to whatever
         * fuel-appropriate item is in inventory.
         * @param quantity - Optional quantity to smelt. Defaults to 1.
         */
      `,
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmeltItemsResults = void 0;
var SmeltItemsResults;
(function (SmeltItemsResults) {
    class InvalidItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a recognized smeltable minecraft item.`;
        }
    }
    SmeltItemsResults.InvalidItem = InvalidItem;
    class SpecifiedFuelItemNotInInventory {
        constructor(item, quantity) {
            this.message = `SkillInvocationError: The specified fuel item '${item}' is not in your inventory.`;
        }
    }
    SmeltItemsResults.SpecifiedFuelItemNotInInventory = SpecifiedFuelItemNotInInventory;
    class FuelItemNotInInventory {
        constructor(item) {
            this.message = `SkillInvocationError: Smelting requires a fuel item (e.g., coal), but there is no such item in your inventory.`;
        }
    }
    SmeltItemsResults.FuelItemNotInInventory = FuelItemNotInInventory;
    class NoFurnaceEtc {
        constructor(item) {
            this.message = `SkillInvocationError: Smelting requires something to smelt in (e.g., a furnace), but there is no such thing in your inventory or immediate surroundings.`;
        }
    }
    SmeltItemsResults.NoFurnaceEtc = NoFurnaceEtc;
    class PartialSuccess {
        constructor(smeltedItem, smeltedItemQuantity, targetItemQuantity, resultingItem, resultingItemQuantity) {
            this.message = `You were only able to smelt ${smeltedItemQuantity} of the intended ${targetItemQuantity} of '${smeltedItem}', acquiring '${resultingItemQuantity}' of '${resultingItem}'.`;
        }
    }
    SmeltItemsResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(smeltedItem, smeltedItemQuantity, resultingItem, resultingItemQuantity) {
            this.message = `You successfully smelted '${smeltedItemQuantity}' of '${smeltedItem}', acquiring '${resultingItemQuantity}' of '${resultingItem}'.`;
        }
    }
    SmeltItemsResults.Success = Success;
})(SmeltItemsResults || (exports.SmeltItemsResults = SmeltItemsResults = {}));

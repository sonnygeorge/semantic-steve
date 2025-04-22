"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmeltItemsResults = void 0;
var SmeltItemsResults;
(function (SmeltItemsResults) {
    class InvalidItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a recognized minecraft item.`;
        }
    }
    SmeltItemsResults.InvalidItem = InvalidItem;
    class InvalidFuelItem {
        constructor(fuelItem) {
            this.message = `SkillInvocationError: '${fuelItem}' is not a recognized minecraft item.`;
        }
    }
    SmeltItemsResults.InvalidFuelItem = InvalidFuelItem;
    class NonSmeltableItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a smeltable item.`;
        }
    }
    SmeltItemsResults.NonSmeltableItem = NonSmeltableItem;
    class FuelItemNotUsableAsFuel {
        constructor(fuelItem) {
            this.message = `SkillInvocationError: '${fuelItem}' cannot be used as fuel in a furnace.`;
        }
    }
    SmeltItemsResults.FuelItemNotUsableAsFuel = FuelItemNotUsableAsFuel;
    class NoFurnaceAvailable {
        constructor(item) {
            this.message = `SkillInvocationError: Smelting ${item} requires a furnace, but there is no furnace in your inventory or immediate surroundings.`;
        }
    }
    SmeltItemsResults.NoFurnaceAvailable = NoFurnaceAvailable;
    class FurnaceNoLongerInImmediateSurroundings {
        constructor() {
            this.message = `Failure: Some self-preservation behavior resulted in movement that left the furnace outside of the immediate surroundings.`;
        }
    }
    SmeltItemsResults.FurnaceNoLongerInImmediateSurroundings = FurnaceNoLongerInImmediateSurroundings;
    class FailedToGetCloseEnoughToFurnace {
        constructor(furnaceCoords) {
            this.message = `Unable to pathfind close enough to the furnace at [${furnaceCoords.x}, ${furnaceCoords.y}, ${furnaceCoords.z}] to smelt.`;
        }
    }
    SmeltItemsResults.FailedToGetCloseEnoughToFurnace = FailedToGetCloseEnoughToFurnace;
    class FurnacePlacementFailed {
        constructor(placeBlockResult) {
            this.message = `Smelting failed since furnace placement didn't resolve with success. ${placeBlockResult.message}`;
        }
    }
    SmeltItemsResults.FurnacePlacementFailed = FurnacePlacementFailed;
    class InsufficientSmeltItems {
        constructor(quantity, item) {
            this.message = `SkillInvocationError: You do not have enough '${item}' to smelt ${quantity} of them.`;
        }
    }
    SmeltItemsResults.InsufficientSmeltItems = InsufficientSmeltItems;
    class InsufficientFuel {
        constructor(fuelItem, itemToSmelt) {
            this.message = `SkillInvocationError: You do not have enough '${fuelItem.name}' to use as fuel for smelting '${itemToSmelt}'.`;
        }
    }
    SmeltItemsResults.InsufficientFuel = InsufficientFuel;
    class Success {
        constructor(item, quantity) {
            this.message = `You acquired ${quantity} of smelted '${item}'.`;
        }
    }
    SmeltItemsResults.Success = Success;
})(SmeltItemsResults || (exports.SmeltItemsResults = SmeltItemsResults = {}));

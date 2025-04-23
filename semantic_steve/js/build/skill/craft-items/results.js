"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CraftItemsResults = void 0;
var CraftItemsResults;
(function (CraftItemsResults) {
    class InvalidItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a recognized minecraft item.`;
        }
    }
    CraftItemsResults.InvalidItem = InvalidItem;
    class NonCraftableItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a craftable item.`;
        }
    }
    CraftItemsResults.NonCraftableItem = NonCraftableItem;
    class TableNoLongerInImmediateSurroundings {
        constructor() {
            this.message = `Failure: Some self-preservation behavior resulted in movement that left the crafting outside of the immediate surroundings.`;
        }
    }
    CraftItemsResults.TableNoLongerInImmediateSurroundings = TableNoLongerInImmediateSurroundings;
    class FailedToGetCloseEnoughToTable {
        constructor(tableCoords) {
            this.message = `Unable to pathfind close enough to the crafting table at [${tableCoords.x}, ${tableCoords.y}, ${tableCoords.z}] to craft.`;
        }
    }
    CraftItemsResults.FailedToGetCloseEnoughToTable = FailedToGetCloseEnoughToTable;
    class CraftingTablePlacementFailed {
        constructor(placeBlockResult) {
            this.message = `Crafting failed since crafting table placement didn't resolve with success. ${placeBlockResult.message}`;
        }
    }
    CraftItemsResults.CraftingTablePlacementFailed = CraftingTablePlacementFailed;
    class InsufficientRecipeIngredients {
        constructor(item, quantity) {
            this.message = `SkillInvocationError: You do not have the prerequisite ingredients to craft '${quantity}' of '${item}'.`;
        }
    }
    CraftItemsResults.InsufficientRecipeIngredients = InsufficientRecipeIngredients;
    class NoCraftingTable {
        constructor(item) {
            this.message = `SkillInvocationError: Crafting ${item} requires a crafting table, but there is no crafting table in your inventory or immediate surroundings.`;
        }
    }
    CraftItemsResults.NoCraftingTable = NoCraftingTable;
    class Success {
        constructor(item, quantity) {
            this.message = `You acquired ${quantity} of '${item}'.`;
        }
    }
    CraftItemsResults.Success = Success;
    class SuccessProblemCollectingCraftingTable {
        constructor(item, quantity, mineBlocksResult) {
            this.message = `You acquired ${quantity} of '${item}', but the crafting table was not collected.`;
            if (mineBlocksResult) {
                this.message += ` ${mineBlocksResult.message}`;
            }
        }
    }
    CraftItemsResults.SuccessProblemCollectingCraftingTable = SuccessProblemCollectingCraftingTable;
})(CraftItemsResults || (exports.CraftItemsResults = CraftItemsResults = {}));

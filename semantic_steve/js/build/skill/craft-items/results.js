"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CraftItemsResults = void 0;
var CraftItemsResults;
(function (CraftItemsResults) {
    class InvalidItem {
        constructor(item) {
            this.message = `SkillInvocationError: '${item}' is not a recognized craftable minecraft item.`;
        }
    }
    CraftItemsResults.InvalidItem = InvalidItem;
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
            this.message = `You successfully crafted '${quantity}' of '${item}'.`;
        }
    }
    CraftItemsResults.Success = Success;
})(CraftItemsResults || (exports.CraftItemsResults = CraftItemsResults = {}));

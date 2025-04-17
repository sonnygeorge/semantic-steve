"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathfindToItemResults = void 0;
var PathfindToItemResults;
(function (PathfindToItemResults) {
    class InvalidItem {
        constructor(itemName) {
            this.message = `SkillInvocationError: '${itemName}' is not a recognized or supported item entity.`;
        }
    }
    PathfindToItemResults.InvalidItem = InvalidItem;
    class ItemNotFound {
        constructor(itemName) {
            this.message = `SkillInvocationError: Item '${itemName}' is not visible in your surroundings. Cannot pathfind to it.`;
        }
    }
    PathfindToItemResults.ItemNotFound = ItemNotFound;
    class PartialSuccess {
        constructor(reachedCoords, itemCoords, itemName) {
            const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
            const itemCoordsString = `[${itemCoords.x}, ${itemCoords.y}, ${itemCoords.z}]`;
            this.message = `You were only able to pathfind to ${reachedCoordsString} and not to the ${itemName} at ${itemCoordsString}.`;
        }
    }
    PathfindToItemResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(itemCoords, itemName) {
            const itemCoordsString = `[${itemCoords.x}, ${itemCoords.y}, ${itemCoords.z}]`;
            this.message = `You were able to successfully pathfind to the ${itemName} at ${itemCoordsString}.`;
        }
    }
    PathfindToItemResults.Success = Success;
})(PathfindToItemResults || (exports.PathfindToItemResults = PathfindToItemResults = {}));

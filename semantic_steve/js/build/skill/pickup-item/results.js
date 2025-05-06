"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupItemResults = void 0;
var PickupItemResults;
(function (PickupItemResults) {
    class InvalidItem {
        constructor(itemName) {
            this.message = `SkillInvocationError: '${itemName}' is not a recognized or supported item.`;
        }
    }
    PickupItemResults.InvalidItem = InvalidItem;
    class NotInImmediateSurroundings {
        constructor(itemName) {
            this.message = `SkillInvocationError: '${itemName}' is not visible in your immediate surroundings.`;
        }
    }
    PickupItemResults.NotInImmediateSurroundings = NotInImmediateSurroundings;
    class SuccessImmediateSurroundings {
        constructor(itemName, netItemGain) {
            this.message = `You successfully made your way nearby '${itemName}' and, while doing so, gained a net of ${netItemGain} of '${itemName}' items.`;
        }
    }
    PickupItemResults.SuccessImmediateSurroundings = SuccessImmediateSurroundings;
    class TargetCoordsNoLongerInImmediateSurroundings {
        constructor(itemName) {
            this.message = `Somehow, while trying to pathfind to ${itemName} in the immediate surroundings, the pathfinding algorithm left you farther away... This is almost certainly just a quirk of an often-goofy pathfinding algorithm failing to find and traverse a path. Maybe try mining some blocks around the area if you have an appropriate tool for doing so?`;
        }
    }
    PickupItemResults.TargetCoordsNoLongerInImmediateSurroundings = TargetCoordsNoLongerInImmediateSurroundings;
    class CouldNotProgramaticallyVerify {
        constructor(itemName) {
            this.message = `100% certain programmatic verification of the pickup of ${itemName} is not yet implemented for the case as it occured. Please defer to 'inventoryChanges' to see if any items were acquired.`;
        }
    }
    PickupItemResults.CouldNotProgramaticallyVerify = CouldNotProgramaticallyVerify;
})(PickupItemResults || (exports.PickupItemResults = PickupItemResults = {}));

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceBlockResults = void 0;
var PlaceBlockResults;
(function (PlaceBlockResults) {
    class InvalidBlock {
        constructor(block) {
            this.message = `SkillInvocationError: '${block}' is not a recognized minecraft block.`;
        }
    }
    PlaceBlockResults.InvalidBlock = InvalidBlock;
    class BlockNotInInventory {
        constructor(block) {
            this.message = `SkillInvocationError: You do not have '${block}' in your inventory.`;
        }
    }
    PlaceBlockResults.BlockNotInInventory = BlockNotInInventory;
    class CoordinatesTooFar {
        constructor() {
            this.message = `SkillInvocationError: The specified coordinates must be within your immediate surroundings. Please pathfind to or near the coordinates first.`;
        }
    }
    PlaceBlockResults.CoordinatesTooFar = CoordinatesTooFar;
    class Success {
        constructor(block, coordinates) {
            this.message = `You successfully placed '${block}' at coordinates '${coordinates}'.`;
        }
    }
    PlaceBlockResults.Success = Success;
    class FailureNoAdjacentBlocks {
        constructor(block, coordinates) {
            this.message = `You were unable to place '${block}' at coordinates '${coordinates}' because there were no adjacent blocks to place onto.`;
        }
    }
    PlaceBlockResults.FailureNoAdjacentBlocks = FailureNoAdjacentBlocks;
})(PlaceBlockResults || (exports.PlaceBlockResults = PlaceBlockResults = {}));

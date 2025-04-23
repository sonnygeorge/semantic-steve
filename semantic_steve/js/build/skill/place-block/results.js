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
    class UnplaceableCoords {
        constructor(coordinates) {
            this.message = `SkillInvocationError: The coordinates '${coordinates}' are not placeable. Please call 'getPlaceableCoordinates' and try again with placeable coordinates.`;
        }
    }
    PlaceBlockResults.UnplaceableCoords = UnplaceableCoords;
    class PlacingFailure {
        constructor(block, coordinates) {
            this.message = `For some reason, the attempted placement of '${block}' at coordinates '${coordinates}' did not result in the block now being at those coordinates.`;
        }
    }
    PlaceBlockResults.PlacingFailure = PlacingFailure;
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

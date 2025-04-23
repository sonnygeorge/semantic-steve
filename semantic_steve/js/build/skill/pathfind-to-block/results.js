"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathfindToBlockResults = void 0;
var PathfindToBlockResults;
(function (PathfindToBlockResults) {
    class InvalidBlock {
        constructor(blockName) {
            this.message = `SkillInvocationError: '${blockName}' is not a recognized or supported block type.`;
        }
    }
    PathfindToBlockResults.InvalidBlock = InvalidBlock;
    class BlockNotFound {
        constructor(blockName) {
            this.message = `SkillInvocationError: Block '${blockName}' is not visible in your surroundings. Cannot pathfind to it.`;
        }
    }
    PathfindToBlockResults.BlockNotFound = BlockNotFound;
    class PartialSuccess {
        constructor(reachedCoords, blockCoords, blockName) {
            const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
            const blockCoordsString = `[${blockCoords.x}, ${blockCoords.y}, ${blockCoords.z}]`;
            this.message = `You were only able to pathfind to ${reachedCoordsString} and not to the ${blockName} at ${blockCoordsString}.`;
        }
    }
    PathfindToBlockResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(blockCoords, blockName) {
            const blockCoordsString = `[${blockCoords.x}, ${blockCoords.y}, ${blockCoords.z}]`;
            this.message = `You were able to successfully pathfind to the ${blockName} at ${blockCoordsString}.`;
        }
    }
    PathfindToBlockResults.Success = Success;
})(PathfindToBlockResults || (exports.PathfindToBlockResults = PathfindToBlockResults = {}));

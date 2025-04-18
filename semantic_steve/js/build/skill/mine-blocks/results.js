"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MineBlocksResults = void 0;
var MineBlocksResults;
(function (MineBlocksResults) {
    class InvalidBlock {
        constructor(block) {
            this.message = `SkillInvocationError: '${block}' is not a recognized minecraft block.`;
        }
    }
    MineBlocksResults.InvalidBlock = InvalidBlock;
    class MissingNecessaryTool {
        constructor(block) {
            this.message = `SkillInvocationError: You do not have the necessary tool to mine '${block}'.`;
        }
    }
    MineBlocksResults.MissingNecessaryTool = MissingNecessaryTool;
    class BlockNotInSurroundings {
        constructor(block) {
            this.message = `SkillInvocationError: At least 1 of block '${block}' must be in the immediate surroundings to invoke this skill.`;
        }
    }
    MineBlocksResults.BlockNotInSurroundings = BlockNotInSurroundings;
    class PartialSuccess {
        constructor(block, quantityMined, targetQuantity) {
            this.message = `You only mined ${quantityMined} of the intended ${targetQuantity} of '${block}'.`;
        }
    }
    MineBlocksResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(block, quantityMined) {
            this.message = `You successfully mined ${quantityMined} of '${block}'.`;
        }
    }
    MineBlocksResults.Success = Success;
})(MineBlocksResults || (exports.MineBlocksResults = MineBlocksResults = {}));

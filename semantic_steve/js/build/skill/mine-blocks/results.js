"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MineBlocksResults = exports.MineBlocksPartialSuccessReason = void 0;
var MineBlocksPartialSuccessReason;
(function (MineBlocksPartialSuccessReason) {
    MineBlocksPartialSuccessReason["TOOL_CONSUMED"] = "The necessary tool was consumed during use.";
    MineBlocksPartialSuccessReason["NO_MORE_IN_IMMEDIATE_SURROUNDINGS"] = "No more blocks of this type are in the immediate surroundings.";
    MineBlocksPartialSuccessReason["COULD_NOT_PATHFIND_UNTIL_REACHABLE"] = "Could not pathfind close enough to reach the block.";
})(MineBlocksPartialSuccessReason || (exports.MineBlocksPartialSuccessReason = MineBlocksPartialSuccessReason = {}));
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
    class BlockNotInImmediateSurroundings {
        constructor(block) {
            this.message = `SkillInvocationError: At least 1 of block '${block}' must be in the immediate surroundings to invoke this skill.`;
        }
    }
    MineBlocksResults.BlockNotInImmediateSurroundings = BlockNotInImmediateSurroundings;
    class PartialSuccess {
        constructor(block, quantityBroken, targetQuantity, dropName, numDropsAqcuired, reason) {
            this.message = `You broke at least ${quantityBroken} of the intended ${targetQuantity} of '${block}'`;
            if (dropName && numDropsAqcuired) {
                this.message += ` and acquired ${numDropsAqcuired} of '${dropName}'.`;
            }
            else {
                this.message += ` and did not acquire any drops.`;
            }
            if (reason) {
                this.message += ` NOTE: ${reason}`;
            }
        }
    }
    MineBlocksResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(block, quantityBroken, targetQuantity, dropName, numDropsAqcuired) {
            this.message = `You successfully broke at least ${quantityBroken} of the intended of the ${targetQuantity} of '${block}'`;
            if (dropName && numDropsAqcuired) {
                this.message += ` and acquired ${numDropsAqcuired} of '${dropName}'.`;
            }
            else {
                this.message += ` and did not acquire any drops.`;
            }
        }
    }
    MineBlocksResults.Success = Success;
})(MineBlocksResults || (exports.MineBlocksResults = MineBlocksResults = {}));

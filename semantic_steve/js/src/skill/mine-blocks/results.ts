import { SkillResult } from "../../types";

export enum MineBlocksPartialSuccessReason {
  TOOL_CONSUMED = "The necessary tool was consumed during use.",
  NO_MORE_IN_IMMEDIATE_SURROUNDINGS = "No more blocks of this type are in the immediate surroundings.",
  COULD_NOT_PATHFIND_UNTIL_REACHABLE = "Could not pathfind close enough to reach the block.",
}

export namespace MineBlocksResults {
  export class InvalidBlock implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: '${block}' is not a recognized minecraft block.`;
    }
  }

  export class MissingNecessaryTool implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: You do not have the necessary tool to mine '${block}'.`;
    }
  }

  export class BlockNotInImmediateSurroundings implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: At least 1 of block '${block}' must be in the immediate surroundings to invoke this skill.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(
      block: string,
      quantityBroken: number,
      targetQuantity: number,
      dropName?: string,
      numDropsAqcuired?: number,
      reason?: MineBlocksPartialSuccessReason | string,
    ) {
      this.message = `You broke at least ${quantityBroken} of the intended ${targetQuantity} of '${block}'`;
      if (dropName && numDropsAqcuired) {
        this.message += ` and acquired ${numDropsAqcuired} of '${dropName}'.`;
      } else {
        this.message += ` and did not acquire any drops.`;
      }
      if (reason) {
        this.message += ` NOTE: ${reason}`;
      }
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(
      block: string,
      quantityBroken: number,
      targetQuantity: number,
      dropName?: string,
      numDropsAqcuired?: number,
    ) {
      this.message = `You successfully broke at least ${quantityBroken} of the intended of the ${targetQuantity} of '${block}'`;
      if (dropName && numDropsAqcuired) {
        this.message += ` and acquired ${numDropsAqcuired} of '${dropName}'.`;
      } else {
        this.message += ` and did not acquire any drops.`;
      }
    }
  }
}

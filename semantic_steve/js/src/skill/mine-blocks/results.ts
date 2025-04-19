import { SkillResult } from "../../types";

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

  export class BlockNotInSurroundings implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: At least 1 of block '${block}' must be in the immediate surroundings to invoke this skill.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(block: string, quantityMined: number, targetQuantity: number) {
      this.message = `You only mined ${quantityMined} of the intended ${targetQuantity} of '${block}'. REMINDER: This does not necessarily mean you collected the drops from the mined blocks; please use 'pickUpItems' if you would like to collect any lingering drops.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(block: string, quantityMined: number) {
      this.message = `You successfully mined ${quantityMined} of '${block}'.`;
    }
  }
}

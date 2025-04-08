import { SkillResult } from "../skill-results";
import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

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
      this.message = `You only mined ${quantityMined} of the intended ${targetQuantity} of '${block}'.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(block: string, quantityMined: number) {
      this.message = `You successfully mined ${quantityMined} of '${block}'.`;
    }
  }
}

export class MineBlocks extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "mineBlocks",
    signature: "mineBlocks(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Auto-equipping the best tool for the job, attempts to mine the specified
         * quantity of the specified block, assuming the block(s) is/are in the immediate
         * surroundings.
         * @param block - The block to mine.
         * @param quantity - Optional quantity to mine. Defaults to 1.
         */
      `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(item: string, quantity: number = 1): Promise<void> {
    // TODO
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${MineBlocks.metadata.name}'`);
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${MineBlocks.metadata.name}'`);
  }
}

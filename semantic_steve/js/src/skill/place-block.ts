import { SkillResult } from "../skill-results";
import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

export namespace PlaceBlockResults {
  export class InvalidBlock implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: '${block}' is not a recognized minecraft block.`;
    }
  }

  export class BlockNotInInventory implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: You do not have '${block}' in your inventory.`;
    }
  }

  export class CoordinatesTooFar implements SkillResult {
    message: string;
    constructor() {
      this.message = `SkillInvocationError: The specified coordinates must be within your immediate surroundings. Please pathfind to or near the coordinates first.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(block: string, coordinates: string) {
      this.message = `You successfully placed '${block}' at coordinates '${coordinates}'.`;
    }
  }

  export class FailureNoAdjacentBlocks implements SkillResult {
    message: string;
    constructor(block: string, coordinates: string) {
      this.message = `You were unable to place '${block}' at coordinates '${coordinates}' because there were no adjacent blocks to place onto.`;
    }
  }
}

export class PlaceBlock extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "placeBlock",
    signature:
      "placeBlock(block: string, atCoordinates?: [number, number, number])",
    docstring: `
        /**
         * Attempts to place a block at the specified coordinates, assuming these
         * coordinates are within the immediate surroundings.
         * @param block - The block to place.
         * @param atCoordinates - Optional target coordinates for block placement.
         * Defaults to an arbitrary location adjacent to the player.
         */
      `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(
    block: string,
    atCoordinates?: [number, number, number]
  ): Promise<void> {
    // TODO
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PlaceBlock.metadata.name}'`);
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${PlaceBlock.metadata.name}'`);
  }
}

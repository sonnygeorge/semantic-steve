import { SkillResult } from "../../skill-results";

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

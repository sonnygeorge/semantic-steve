import { SkillResult } from "../../types";

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

  export class UnplaceableCoords implements SkillResult {
    message: string;
    constructor(coordinates: string) {
      this.message = `SkillInvocationError: The coordinates '${coordinates}' are not placeable. Please call 'getPlaceableCoordinates' and try again with placeable coordinates.`;
    }
  }

  export class PlacingFailure implements SkillResult {
    message: string;
    constructor(block: string, coordinates: string) {
      this.message = `For some reason, the attempted placement of '${block}' at coordinates '${coordinates}' did not result in the block now being at those coordinates.`;
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

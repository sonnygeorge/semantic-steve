import { SkillResult } from "../../types";

export namespace PickupItemResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(itemName: string) {
      this.message = `SkillInvocationError: '${itemName}' is not a recognized or supported item.`;
    }
  }

  export class NotInImmediateSurroundings implements SkillResult {
    message: string;
    constructor(itemName: string) {
      this.message = `SkillInvocationError: '${itemName}' is not visible in your immediate surroundings.`;
    }
  }

  export class SuccessImmediateSurroundings implements SkillResult {
    message: string;
    constructor(itemName: string, netItemGain: number) {
      this.message = `You successfully made your way nearby '${itemName}' and, while doing so, gained a net of ${netItemGain} of '${itemName}' items.`;
    }
  }

  export class TargetCoordsNoLongerInImmediateSurroundings
    implements SkillResult
  {
    message: string;
    constructor(itemName: string) {
      this.message = `Somehow, while trying to pathfind to ${itemName} in the immediate surroundings, the pathfinding algorithm left you farther away... This is almost certainly just a quirk of an often-goofy pathfinding algorithm failing to find and traverse a path. Maybe try mining some blocks around the area if you have an appropriate tool for doing so?`;
    }
  }

  export class CouldNotProgramaticallyVerify implements SkillResult {
    message: string;
    constructor(itemName: string) {
      this.message = `100% certain programmatic verification of the pickup of ${itemName} is not yet implemented for the case as it occured. Please defer to 'inventoryChanges' to see if any items were acquired.`;
    }
  }
}

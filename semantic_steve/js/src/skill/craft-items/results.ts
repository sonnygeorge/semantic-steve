import { Vec3 } from "vec3";
import { SkillResult } from "../../types";

export namespace CraftItemsResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a recognized minecraft item.`;
    }
  }

  export class NonCraftableItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a craftable item.`;
    }
  }

  export class TableNoLongerInImmediateSurroundings implements SkillResult {
    message: string;
    constructor() {
      this.message = `Failure: Some self-preservation behavior resulted in movement that left the crafting outside of the immediate surroundings.`;
    }
  }

  export class FailedToGetCloseEnoughToTable implements SkillResult {
    message: string;
    constructor(tableCoords: Vec3) {
      this.message = `Unable to pathfind close enough to the crafting table at [${tableCoords.x}, ${tableCoords.y}, ${tableCoords.z}] to craft.`;
    }
  }

  export class CraftingTablePlacementFailed implements SkillResult {
    message: string;
    constructor(placeBlockResult: SkillResult) {
      this.message = `Crafting failed since crafting table placement didn't resolve with success. ${placeBlockResult.message}`;
    }
  }

  export class InsufficientRecipeIngredients implements SkillResult {
    message: string;
    constructor(item: string, quantity: number) {
      this.message = `SkillInvocationError: You do not have the prerequisite ingredients to craft '${quantity}' of '${item}'.`;
    }
  }

  export class NoCraftingTable implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: Crafting ${item} requires a crafting table, but there is no crafting table in your inventory or immediate surroundings.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(item: string, quantity: number) {
      this.message = `You acquired ${quantity} of '${item}'.`;
    }
  }
}

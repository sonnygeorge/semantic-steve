import { Vec3 } from "vec3";
import { SkillResult } from "../../types";
import { ItemEntity } from "../../thing/item-entity";

export namespace SmeltItemsResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a recognized minecraft item.`;
    }
  }

  export class InvalidFuelItem implements SkillResult {
    message: string;
    constructor(fuelItem: string) {
      this.message = `SkillInvocationError: '${fuelItem}' is not a recognized minecraft item.`;
    }
  }

  export class NonSmeltableItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a smeltable item.`;
    }
  }

  export class FuelItemNotUsableAsFuel implements SkillResult {
    message: string;
    constructor(fuelItem: string) {
      this.message = `SkillInvocationError: '${fuelItem}' cannot be used as fuel in a furnace.`;
    }
  }

  export class NoFurnaceAvailable implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: Smelting ${item} requires a furnace, but there is no furnace in your inventory or immediate surroundings.`;
    }
  }

  export class FurnaceNoLongerInImmediateSurroundings implements SkillResult {
    message: string;
    constructor() {
      this.message = `Failure: Some self-preservation behavior resulted in movement that left the furnace outside of the immediate surroundings.`;
    }
  }

  export class FailedToGetCloseEnoughToFurnace implements SkillResult {
    message: string;
    constructor(furnaceCoords: Vec3) {
      this.message = `Unable to pathfind close enough to the furnace at [${furnaceCoords.x}, ${furnaceCoords.y}, ${furnaceCoords.z}] to smelt.`;
    }
  }

  export class FurnacePlacementFailed implements SkillResult {
    message: string;
    constructor(placeBlockResult: SkillResult) {
      this.message = `Smelting failed since furnace placement didn't resolve with success. ${placeBlockResult.message}`;
    }
  }

  export class InsufficientSmeltItems implements SkillResult {
    message: string;
    constructor(quantity: number, item: string) {
      this.message = `SkillInvocationError: You do not have enough '${item}' to smelt ${quantity} of them.`;
    }
  }

  export class InsufficientFuel implements SkillResult {
    message: string;
    constructor(fuelItem: ItemEntity, itemToSmelt: string) {
      this.message = `SkillInvocationError: You do not have enough '${fuelItem.name}' to use as fuel for smelting '${itemToSmelt}'.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(item: string, quantity: number) {
      this.message = `You acquired ${quantity} of smelted '${item}'.`;
    }
  }
}

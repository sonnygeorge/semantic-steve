import { SkillResult } from "../../types";

export namespace SmeltItemsResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a recognized smeltable minecraft item.`;
    }
  }

  export class SpecifiedFuelItemNotInInventory implements SkillResult {
    message: string;
    constructor(item: string, quantity: number) {
      this.message = `SkillInvocationError: The specified fuel item '${item}' is not in your inventory.`;
    }
  }

  export class FuelItemNotInInventory implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: Smelting requires a fuel item (e.g., coal), but there is no such item in your inventory.`;
    }
  }

  export class NoFurnaceEtc implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: Smelting requires something to smelt in (e.g., a furnace), but there is no such thing in your inventory or immediate surroundings.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(
      smeltedItem: string,
      smeltedItemQuantity: number,
      targetItemQuantity: number,
      resultingItem: string,
      resultingItemQuantity: number,
    ) {
      this.message = `You were only able to smelt ${smeltedItemQuantity} of the intended ${targetItemQuantity} of '${smeltedItem}', acquiring '${resultingItemQuantity}' of '${resultingItem}'.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(
      smeltedItem: string,
      smeltedItemQuantity: number,
      resultingItem: string,
      resultingItemQuantity: number,
    ) {
      this.message = `You successfully smelted '${smeltedItemQuantity}' of '${smeltedItem}', acquiring '${resultingItemQuantity}' of '${resultingItem}'.`;
    }
  }
}

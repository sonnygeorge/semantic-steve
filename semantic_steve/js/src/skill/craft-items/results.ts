import { SkillResult } from "../../skill-results";

export namespace CraftItemsResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(item: string) {
      this.message = `SkillInvocationError: '${item}' is not a recognized craftable minecraft item.`;
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
      this.message = `You successfully crafted '${quantity}' of '${item}'.`;
    }
  }
}

import { SkillResult } from "../skill-results";
import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

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

export class CraftItems extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "craftItems",
    signature: "craftItems(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Crafts one or more of an item, assuming a crafting table (if necessary for the
         * recipe) is either in inventory or in the immediate surroundings.
         * @param item - The item to craft.
         * @param quantity - Optional quantity to craft. Defaults to 1.
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
    console.log(`Pausing '${CraftItems.metadata.name}'`);
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${CraftItems.metadata.name}'`);
  }
}

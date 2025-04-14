import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { CraftItemsResults } from "./results";
import {
  hasCraftingTableInInventory,
  findNearbyCraftingTable,
  placeCraftingTable,
} from "./utils";

export class CraftItems extends Skill {
  public static readonly TIMEOUT_MS: number = 10000; // 10 seconds
  public static readonly METADATA: SkillMetadata = {
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

  private isCrafting: boolean = false;
  private craftItem: string = "";
  private craftQuantity: number = 0;
  private selectedRecipe: any = null;
  private craftingTableRequired: boolean = false;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(item: string, quantity: number = 1): Promise<void> {
    this.isCrafting = true;
    this.craftItem = item;
    this.craftQuantity = quantity;

    try {
      // Normalize item name
      const normalizedItem = item;

      const id = this.bot.registry.itemsByName[normalizedItem]?.id;
      if (!id) {
        this.isCrafting = false;
        return this.onResolution(new CraftItemsResults.InvalidItem(item));
      }

      // Get all available recipes from the bot
      const recipes = this.bot.recipesFor(id, null, quantity, true);

      if (recipes.length === 0) {
        this.isCrafting = false;
        return this.onResolution(new CraftItemsResults.InvalidItem(item));
      }

      // Attempt to find a recipe we can craft with our current inventory
      this.craftingTableRequired = false;
      this.selectedRecipe = null;

      for (const recipe of recipes) {
        if (recipe.requiresTable) {
          this.craftingTableRequired = true;
        }

        // Check if we have enough ingredients for this recipe
        // this will have to use my plugin.

        // const canCraft = this.bot.canCraft(recipe);
        // if (canCraft) {
        this.selectedRecipe = recipe;
        //   break;
        // }
      }

      // If no recipe was found that we can craft
      if (!this.selectedRecipe) {
        this.isCrafting = false;
        return this.onResolution(
          new CraftItemsResults.InsufficientRecipeIngredients(item, quantity)
        );
      }

      // If crafting table is required, check if we have one or can access one
      if (this.craftingTableRequired) {
        const craftingTable = await this.findCraftingTable();

        if (!craftingTable) {
          this.isCrafting = false;
          return this.onResolution(new CraftItemsResults.NoCraftingTable(item));
        }
      }

      // Perform the actual crafting operation
      return this.doCrafting();
    } catch (error) {
      // Handle unexpected errors
      console.error(`Error crafting ${item}:`, error);
      this.isCrafting = false;
      return this.onResolution(
        new CraftItemsResults.InsufficientRecipeIngredients(item, quantity)
      );
    }
  }

  async pause(): Promise<void> {
    this.isCrafting = false;
    console.log("Pausing crafting operation...");
    return Promise.resolve();
  }

  async resume(): Promise<void> {
    if (this.craftItem && this.selectedRecipe) {
      this.isCrafting = true;
      console.log("Resuming crafting operation...");
      return this.doCrafting();
    }
    return Promise.resolve();
  }

  /**
   * Helper method that performs the actual crafting operation
   * Called by both invoke and resume
   */
  private async doCrafting(): Promise<void> {
    try {
      if (!this.isCrafting || !this.selectedRecipe) {
        return Promise.resolve();
      }

      // If a crafting table is required, find one
      if (this.craftingTableRequired) {
        const craftingTable = await this.findCraftingTable();
        if (craftingTable) {
          await this.bot.craft(
            this.selectedRecipe,
            this.craftQuantity,
            craftingTable
          );
        } else {
          throw new Error("Crafting table required but not found");
        }
      } else {
        // Otherwise craft without a crafting table
        await this.bot.craft(this.selectedRecipe, this.craftQuantity);
      }

      // Successfully crafted all requested items
      this.isCrafting = false;
      return this.onResolution(
        new CraftItemsResults.Success(this.craftItem, this.craftQuantity)
      );
    } catch (error) {
      // Handle unexpected errors
      console.error(`Error in doCrafting:`, error);
      this.isCrafting = false;
      return this.onResolution(
        new CraftItemsResults.InsufficientRecipeIngredients(
          this.craftItem,
          this.craftQuantity
        )
      );
    }
  }

  /**
   * Finds a crafting table in the bot's inventory or nearby in the world
   * @returns The crafting table block if found, null otherwise
   */
  private async findCraftingTable() {
    // First check if we have a crafting table in our inventory
    const craftingTableItem = hasCraftingTableInInventory(this.bot);
    if (craftingTableItem) {
      // If we have a crafting table in inventory, try to place it
      const placed = await placeCraftingTable(this.bot);
      if (placed) {
        return findNearbyCraftingTable(this.bot);
      }
    }

    // If we don't have one in inventory or couldn't place it, look for one nearby
    return findNearbyCraftingTable(this.bot);
  }
}

import { SkillResult } from "../skill-results";
import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";
import {Vec3} from 'vec3';

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

// Utility functions moved outside the class
/**
 * Checks if the bot has a crafting table in their inventory
 * @returns The crafting table item if found, null otherwise
 */
function hasCraftingTableInInventory(bot: Bot) {
  const craftingTableItem = bot.inventory.items().find(item => 
    item.name === 'crafting_table'
  );
  return craftingTableItem || null;
}

/**
 * Finds a crafting table block near the bot
 * @param bot The bot instance
 * @param maxDistance Maximum distance to search for a crafting table
 * @returns The crafting table block if found, null otherwise
 */
function findNearbyCraftingTable(bot: Bot, maxDistance = 4) {
  const craftingTable = bot.findBlock({
    matching: block => block.name === 'crafting_table',
    maxDistance: maxDistance
  });
  return craftingTable || null;
}

/**
 * Finds a suitable position to place a block near the bot
 * @param bot The bot instance
 * @returns An object containing reference block and face vector if found, null otherwise
 */
function findSuitablePlacementPosition(bot: Bot) {
  // Try to find a solid block with an empty space above it
  const solidBlocks = bot.findBlocks({
    matching: block => {
      // Check if the block is solid
      if (block.boundingBox !== 'block') return false;
      
      // Check if there's an empty space above it
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
      return !!blockAbove && blockAbove.name === 'air';
    },
    maxDistance: 3,
    count: 5 // Look for a few options
  });
  
  if (solidBlocks.length === 0) return null;
  
  // Sort by distance to player
  solidBlocks.sort((a, b) => {
    const distA = bot.entity.position.distanceTo(bot.blockAt(a)!.position);
    const distB = bot.entity.position.distanceTo(bot.blockAt(b)!.position);
    return distA - distB;
  });
  
  // Get the closest block
  const closestPosition = solidBlocks[0];
  const referenceBlock = bot.blockAt(closestPosition)!;
  
  // Create a reference to the top face of the block
  return {
    referenceBlock: referenceBlock,
    faceVector: new Vec3(0, 1, 0)
  };
}

/**

/**
 * Attempts to place a crafting table from the bot's inventory
 * @param bot The bot instance
 * @returns True if successfully placed, false otherwise
 */
async function placeCraftingTable(bot: Bot): Promise<boolean> {
  try {
    const craftingTableItem = hasCraftingTableInInventory(bot);
    if (!craftingTableItem) return false;
    
    // Equip the crafting table
    await bot.equip(craftingTableItem, 'hand');
    
    // Find a suitable place to put the crafting table
    const placementPosition = findSuitablePlacementPosition(bot);
    if (!placementPosition) return false;
    
    // Place the crafting table
    await bot.placeBlock(placementPosition.referenceBlock, placementPosition.faceVector);
    return true;
  } catch (error) {
    console.error("Error placing crafting table:", error);
    return false;
  }
}

export class CraftItems extends Skill {
  private isCrafting: boolean = false;
  private craftItem: string = '';
  private craftQuantity: number = 0;
  private selectedRecipe: any = null;
  private craftingTableRequired: boolean = false;

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
        return this.onResolution(new CraftItemsResults.InsufficientRecipeIngredients(item, quantity));
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
      return this.onResolution(new CraftItemsResults.InsufficientRecipeIngredients(item, quantity));
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
          await this.bot.craft(this.selectedRecipe, this.craftQuantity, craftingTable);
        } else {
          throw new Error("Crafting table required but not found");
        }
      } else {
        // Otherwise craft without a crafting table
        await this.bot.craft(this.selectedRecipe, this.craftQuantity);
      }
      
      // Successfully crafted all requested items
      this.isCrafting = false;
      return this.onResolution(new CraftItemsResults.Success(this.craftItem, this.craftQuantity));
      
    } catch (error) {
      // Handle unexpected errors
      console.error(`Error in doCrafting:`, error);
      this.isCrafting = false;
      return this.onResolution(new CraftItemsResults.InsufficientRecipeIngredients(this.craftItem, this.craftQuantity));
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
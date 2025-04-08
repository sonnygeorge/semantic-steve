import { SkillResult } from "../skill-results";
import { Bot, Furnace } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";
import type { Block as PBlock } from "prismarine-block";
import type {Item as PItem} from "prismarine-item";

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
      resultingItemQuantity: number
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
      resultingItemQuantity: number
    ) {
      this.message = `You successfully smelted '${smeltedItemQuantity}' of '${smeltedItem}', acquiring '${resultingItemQuantity}' of '${resultingItem}'.`;
    }
  }
}

export class SmeltItems extends Skill {
  private isSmelting: boolean = false;
  private itemToSmelt: string = '';
  private fuelItem: string = '';
  private targetQuantity: number = 0;
  private smeltedQuantity: number = 0;
  private resultItem: string = '';
  private resultQuantity: number = 0;
  private furnaceBlock: PBlock | null = null;
  private furnaceObj: Furnace | null = null;

  public static readonly metadata: SkillMetadata = {
    name: "smeltItems",
    signature:
      "smeltItems(item: string, fuelItem?: string, quantity: number = 1)",
    docstring: `
        /**
         * Smelts items, assuming a furnace (or, e.g., blast furnace or smoker) is in
         * inventory or in the immediate surroundings.
         * @param item - The item to smelt.
         * @param fuelItem - Optional fuel item to use (e.g., coal). Defaults to whatever
         * fuel-appropriate item is in inventory.
         * @param quantity - Optional quantity to smelt. Defaults to 1.
         */
      `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(
    item: string,
    fuelItem?: string,
    quantity: number = 1
  ): Promise<void> {
    this.isSmelting = true;
    this.itemToSmelt = item;
    this.fuelItem = fuelItem || '';
    this.targetQuantity = quantity;
    this.smeltedQuantity = 0;
    this.resultQuantity = 0;
    this.resultItem = '';
    
    try {
      // Check if the item is valid and in inventory
      const smeltItem = this.getItemFromInventory(item);
      if (!smeltItem) {
        this.isSmelting = false;
        return this.onResolution(new SmeltItemsResults.InvalidItem(item));
      }
      
      // Get or infer fuel item
      const fuelItemObj = this.getFuelItem(fuelItem);
      if (!fuelItemObj) {
        this.isSmelting = false;
        if (fuelItem) {
          return this.onResolution(new SmeltItemsResults.SpecifiedFuelItemNotInInventory(fuelItem, quantity));
        } else {
          return this.onResolution(new SmeltItemsResults.FuelItemNotInInventory(item));
        }
      }
      
      // Remember the fuel item name
      this.fuelItem = fuelItemObj.name;
      
      // Find a furnace
      this.furnaceBlock = this.findNearbyFurnace();
      if (!this.furnaceBlock) {
        this.isSmelting = false;
        return this.onResolution(new SmeltItemsResults.NoFurnaceEtc(item));
      }
      
      // Perform the actual smelting
      await this.doSmelting(smeltItem, fuelItemObj);
      
    } catch (error) {
      console.error(`Error in smeltItems:`, error);
      this.handleError(error);
    }
  }

  public async pause(): Promise<void> {
    if (this.isSmelting) {
      this.isSmelting = false;
      console.log(`Pausing '${SmeltItems.metadata.name}'`);
      
      if (this.furnaceObj && this.bot.currentWindow) {
        await this.bot.closeWindow(this.bot.currentWindow);
      }
    }
    return Promise.resolve();
  }

  public async resume(): Promise<void> {
    if (!this.isSmelting && this.itemToSmelt && this.smeltedQuantity < this.targetQuantity) {
      console.log(`Resuming '${SmeltItems.metadata.name}'`);
      
      const smeltItem = this.getItemFromInventory(this.itemToSmelt);
      if (!smeltItem) {
        return this.onResolution(new SmeltItemsResults.InvalidItem(this.itemToSmelt));
      }
      
      const fuelItem = this.getItemFromInventory(this.fuelItem);
      if (!fuelItem) {
        return this.onResolution(new SmeltItemsResults.FuelItemNotInInventory(this.itemToSmelt));
      }
      
      this.furnaceBlock = this.findNearbyFurnace();
      if (!this.furnaceBlock) {
        return this.onResolution(new SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
      }
      
      this.isSmelting = true;
      await this.doSmelting(smeltItem, fuelItem);
    }
    return Promise.resolve();
  }
  
  private async doSmelting(itemToSmelt: PItem, fuelItem: PItem): Promise<void> {
    try {
      // Open the furnace
      this.furnaceObj = await this.bot.openFurnace(this.furnaceBlock!);
      
      // Add fuel and items
      const remainingQuantity = this.targetQuantity - this.smeltedQuantity;
      const quantityToSmelt = Math.min(remainingQuantity, itemToSmelt.count);
      
      // Put fuel in the furnace
      try {
        await this.furnaceObj.putFuel(fuelItem.type, null, 1);
      } catch (error: any) {
        console.error("Error putting fuel in furnace:", error);
        throw new Error(`Failed to put fuel (${fuelItem.name}) in furnace: ${error.message}`);
      }
      
      // Put input in the furnace
      try {
        await this.furnaceObj.putInput(itemToSmelt.type, null, quantityToSmelt);
      } catch (error: any) {
        console.error("Error putting input in furnace:", error);
        throw new Error(`Failed to put input (${itemToSmelt.name}) in furnace: ${error.message}`);
      }
      
      // Monitor smelting until complete
      let smeltingComplete = false;
      while (this.isSmelting && !smeltingComplete) {
        const outputItem = this.furnaceObj.outputItem();
        if (outputItem) {
          try {
            await this.furnaceObj.takeOutput();
            this.smeltedQuantity += outputItem.count;
            this.resultQuantity += outputItem.count;
            // Get the name of the result item
            this.resultItem = outputItem.name;
          } catch (error: any) {
            console.error("Error taking output from furnace:", error);
            throw new Error(`Failed to take output from furnace: ${error.message}`);
          }
        }
        
        // Check if we're done
        if (this.smeltedQuantity >= this.targetQuantity || 
            (!this.furnaceObj.inputItem() && !outputItem)) {
          smeltingComplete = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Close the furnace
      await this.closeFurnace();
      
      // Return the result
      this.isSmelting = false;
      if (this.smeltedQuantity >= this.targetQuantity) {
        this.onResolution(new SmeltItemsResults.Success(
          this.itemToSmelt,
          this.smeltedQuantity,
          this.resultItem,
          this.resultQuantity
        ));
      } else if (this.smeltedQuantity > 0) {
        this.onResolution(new SmeltItemsResults.PartialSuccess(
          this.itemToSmelt,
          this.smeltedQuantity,
          this.targetQuantity,
          this.resultItem,
          this.resultQuantity
        ));
      } else {
        this.onResolution(new SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
      }
      
    } catch (error) {
      console.error("Error in smelting process:", error);
      await this.closeFurnace();
      this.handleError(error);
    }
  }
  
  private async closeFurnace(): Promise<void> {
    if (this.furnaceObj && this.bot.currentWindow) {
      try {
        await this.bot.closeWindow(this.bot.currentWindow);
      } catch (e) {
        console.error("Error closing furnace:", e);
        // Ignore errors when closing
      }
    }
  }
  
  private handleError(error: any): void {
    this.isSmelting = false;
    
    console.error("SmeltItems error:", error);
    
    // Try to give a more specific error message based on the error
    if (error.message && error.message.includes("ItemType")) {
      console.error("Invalid ItemType error - likely incorrect item reference");
    }
    
    if (this.smeltedQuantity > 0) {
      this.onResolution(new SmeltItemsResults.PartialSuccess(
        this.itemToSmelt,
        this.smeltedQuantity,
        this.targetQuantity,
        this.resultItem || "unknown",
        this.resultQuantity
      ));
    } else {
      this.onResolution(new SmeltItemsResults.NoFurnaceEtc(this.itemToSmelt));
    }
  }
  
  private getItemFromInventory(itemName: string): any {
    return this.bot.inventory.items().find(item => item.name === itemName);
  }
  
  private getFuelItem(specifiedFuel?: string): any {
    // Use specified fuel if provided
    if (specifiedFuel) {
      return this.getItemFromInventory(specifiedFuel);
    }
    
    // Find suitable fuel
    return this.findSuitableFuel();
  }
  
  // This will be implemented externally
  private findSuitableFuel(): any {
    return this.bot.inventory.items().find(item => 
      ['coal', 'charcoal', 'coal_block'].includes(item.name) || 
      item.name.includes('wood') || 
      item.name.includes('log')
    );
  }
  
  // This will be implemented externally
  private findNearbyFurnace(): PBlock | null {
    const furnaceTypes = ['furnace', 'blast_furnace', 'smoker'];
    const furnacePositions = this.bot.findBlocks({
      matching: (block) => furnaceTypes.includes(block.name),
      useExtraInfo: true,
      maxDistance: 4,
      count: 1
    });
    
    if (furnacePositions.length === 0) return null;
    return this.bot.blockAt(furnacePositions[0]);
  }
}
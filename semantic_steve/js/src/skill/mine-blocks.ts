import { SkillResult } from "../skill-results";
import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

export namespace MineBlocksResults {
  export class InvalidBlock implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: '${block}' is not a recognized minecraft block.`;
    }
  }

  export class MissingNecessaryTool implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: You do not have the necessary tool to mine '${block}'.`;
    }
  }

  export class BlockNotInSurroundings implements SkillResult {
    message: string;
    constructor(block: string) {
      this.message = `SkillInvocationError: At least 1 of block '${block}' must be in the immediate surroundings to invoke this skill.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(block: string, quantityMined: number, targetQuantity: number) {
      this.message = `You only mined ${quantityMined} of the intended ${targetQuantity} of '${block}'.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(block: string, quantityMined: number) {
      this.message = `You successfully mined ${quantityMined} of '${block}'.`;
    }
  }
}

/**
 * Find blocks of the specified type near the bot
 * @param bot The bot instance
 * @param blockType The type of block to find
 * @param maxDistance Maximum distance to search for blocks
 * @param count Maximum number of blocks to find
 * @returns Array of block positions
 */
function findBlocksOfType(bot: Bot, blockType: string, maxDistance = 16, count = 64): any[] {
  const blockPositions = bot.findBlocks({
    matching: block => block.name === blockType,
    maxDistance: maxDistance,
    count: count
  });
  
  return blockPositions.map(pos => bot.blockAt(pos)).filter(block => block !== null);
}

/**
 * Get the best tool from inventory for mining a specific block
 * @param bot The bot instance
 * @param blockType The type of block to mine
 * @returns The best tool for the job, or null if no suitable tool found
 */
function getBestToolForBlock(bot: Bot, blockType: string): any {
  // Get all tools from inventory
  const tools = bot.inventory.items().filter(item => 
    item.name.endsWith('_pickaxe') || 
    item.name.endsWith('_axe') || 
    item.name.endsWith('_shovel') || 
    item.name.endsWith('_hoe')
  );
  
  // If no tools, return null
  if (tools.length === 0) return null;
  
  // Try to find the most efficient tool for the block
  const block = bot.registry.blocksByName[blockType];
  if (!block) return null;
  
  // Sort tools by efficiency (this is a simplified version)
  // In a real implementation, you would check material effectiveness against block types
  const toolsByEfficiency = tools.sort((a, b) => {
    const materialOrder = ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite'];
    const getMaterialIndex = (itemName: string) => {
      for (let i = 0; i < materialOrder.length; i++) {
        if (itemName.startsWith(materialOrder[i])) return i;
      }
      return -1;
    };
    
    return getMaterialIndex(b.name) - getMaterialIndex(a.name);
  });
  
  return toolsByEfficiency[0];
}

/**
 * Check if a block requires a specific tool to mine
 * @param bot The bot instance
 * @param blockType The type of block to check
 * @returns True if a specific tool is required, false otherwise
 */
function blockRequiresTool(bot: Bot, blockType: string): boolean {
  // This is a simplified check - in real implementation, 
  // you would check block hardness and required tool level
  const hardBlocks = [
    'stone', 'cobblestone', 'ores', 'obsidian', 
    'iron_ore', 'gold_ore', 'diamond_ore', 'netherite_ore'
  ];
  
  return hardBlocks.some(type => blockType.includes(type));
}

export class MineBlocks extends Skill {
  private isMining: boolean = false;
  private blockToMine: string = '';
  private targetQuantity: number = 0;
  private currentQuantity: number = 0;
  private blockPositions: any[] = [];
  private bestTool: any = null;

  public static readonly metadata: SkillMetadata = {
    name: "mineBlocks",
    signature: "mineBlocks(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Auto-equipping the best tool for the job, attempts to mine the specified
         * quantity of the specified block, assuming the block(s) is/are in the immediate
         * surroundings.
         * @param block - The block to mine.
         * @param quantity - Optional quantity to mine. Defaults to 1.
         */
      `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(block: string, quantity: number = 1): Promise<void> {
    this.isMining = true;
    this.blockToMine = block;
    this.targetQuantity = quantity;
    this.currentQuantity = 0;
    this.blockPositions = [];
    
    try {
      // Check if the block is valid
      if (!this.bot.registry.blocksByName[block]) {
        this.isMining = false;
        return this.onResolution(new MineBlocksResults.InvalidBlock(block));
      }
      
      // Find blocks of the specified type nearby
      this.blockPositions = findBlocksOfType(this.bot, block);
      
      if (this.blockPositions.length === 0) {
        this.isMining = false;
        return this.onResolution(new MineBlocksResults.BlockNotInSurroundings(block));
      }
      
      // Check if we need a specific tool for this block
      if (blockRequiresTool(this.bot, block)) {
        this.bestTool = getBestToolForBlock(this.bot, block);
        
        if (!this.bestTool) {
          this.isMining = false;
          return this.onResolution(new MineBlocksResults.MissingNecessaryTool(block));
        }
      }
      
      // Start mining
      return this.doMining();
      
    } catch (error) {
      console.error(`Error in mineBlocks:`, error);
      this.isMining = false;
      
      if (this.currentQuantity > 0) {
        return this.onResolution(new MineBlocksResults.PartialSuccess(block, this.currentQuantity, quantity));
      }
      
      return this.onResolution(new MineBlocksResults.BlockNotInSurroundings(block));
    }
  }

  public async pause(): Promise<void> {
    if (this.isMining) {
      this.isMining = false;
      console.log(`Pausing '${MineBlocks.metadata.name}'`);
      // Stop current mining activity if possible
      try {
        this.bot.stopDigging();
      } catch (error) {
        console.error("Error stopping digging:", error);
      }
    }
    return Promise.resolve();
  }

  public async resume(): Promise<void> {
    if (!this.isMining && this.blockToMine && this.currentQuantity < this.targetQuantity) {
      console.log(`Resuming '${MineBlocks.metadata.name}'`);
      this.isMining = true;
      
      // Re-find blocks in case the world changed while paused
      this.blockPositions = findBlocksOfType(this.bot, this.blockToMine);
      
      if (this.blockPositions.length === 0) {
        this.isMining = false;
        return this.onResolution(new MineBlocksResults.PartialSuccess(
          this.blockToMine, 
          this.currentQuantity, 
          this.targetQuantity
        ));
      }
      
      return this.doMining();
    }
    return Promise.resolve();
  }
  
  /**
   * Helper method that performs the actual mining operation
   * Called by both invoke and resume
   */
  private async doMining(): Promise<void> {
    try {
      if (!this.isMining || this.blockPositions.length === 0) {
        return Promise.resolve();
      }
      
      // Equip the best tool if we have one
      if (this.bestTool) {
        await this.bot.equip(this.bestTool, 'hand');
      }
      
      // Mine blocks until we reach the target quantity or run out of blocks
      while (this.currentQuantity < this.targetQuantity && this.blockPositions.length > 0 && this.isMining) {
        const blockToMine = this.blockPositions.shift();
        
        // If block is still valid (not air, etc.)
        if (blockToMine.name === this.blockToMine) {
          try {
            // Start digging
            await this.bot.dig(blockToMine);
            
            // If we get here, the block was successfully mined
            this.currentQuantity++;
            
            // If we need more blocks, update nearby blocks
            if (this.currentQuantity < this.targetQuantity && this.blockPositions.length < 5) {
              const newBlocks = findBlocksOfType(this.bot, this.blockToMine);
              this.blockPositions = [...newBlocks];
            }
          } catch (error) {
            console.error(`Error mining block:`, error);
            // Continue to the next block
          }
        }
      }
      
      // Resolve with the appropriate result
      this.isMining = false;
      
      if (this.currentQuantity === 0) {
        return this.onResolution(new MineBlocksResults.BlockNotInSurroundings(this.blockToMine));
      } else if (this.currentQuantity < this.targetQuantity) {
        return this.onResolution(new MineBlocksResults.PartialSuccess(
          this.blockToMine, 
          this.currentQuantity, 
          this.targetQuantity
        ));
      } else {
        return this.onResolution(new MineBlocksResults.Success(this.blockToMine, this.currentQuantity));
      }
      
    } catch (error) {
      console.error(`Error in doMining:`, error);
      this.isMining = false;
      
      if (this.currentQuantity > 0) {
        return this.onResolution(new MineBlocksResults.PartialSuccess(
          this.blockToMine, 
          this.currentQuantity, 
          this.targetQuantity
        ));
      }
      
      return this.onResolution(new MineBlocksResults.BlockNotInSurroundings(this.blockToMine));
    }
  }
}
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { once } from "events";
import { MineBlocksResults } from "./results";
import {
  findBlocksOfType,
  blockRequiresTool,
  getBestToolForBlock,
} from "./utils";

export class MineBlocks extends Skill {
  public static readonly TIMEOUT_MS: number = 20000; // 20 seconds
  public static readonly METADATA: SkillMetadata = {
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

  private isMining: boolean = false;
  private blockToMine: string = "";
  private targetQuantity: number = 0;
  private currentQuantity: number = 0;
  private blockPositions: any[] = [];
  private bestTool: any = null;

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
        return this.onResolution(
          new MineBlocksResults.BlockNotInSurroundings(block)
        );
      }

      // Check if we need a specific tool for this block
      if (blockRequiresTool(this.bot, block)) {
        this.bestTool = getBestToolForBlock(this.bot, block);

        if (!this.bestTool) {
          this.isMining = false;
          return this.onResolution(
            new MineBlocksResults.MissingNecessaryTool(block)
          );
        }
      }

      // Start mining
      return this.doMining();
    } catch (error) {
      console.error(`Error in mineBlocks:`, error);
      this.isMining = false;

      if (this.currentQuantity > 0) {
        return this.onResolution(
          new MineBlocksResults.PartialSuccess(
            block,
            this.currentQuantity,
            quantity
          )
        );
      }

      return this.onResolution(
        new MineBlocksResults.BlockNotInSurroundings(block)
      );
    }
  }

  public async pause(): Promise<void> {
    if (this.isMining) {
      this.isMining = false;
      console.log(`Pausing '${MineBlocks.METADATA.name}'`);
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
    if (
      !this.isMining &&
      this.blockToMine &&
      this.currentQuantity < this.targetQuantity
    ) {
      console.log(`Resuming '${MineBlocks.METADATA.name}'`);
      this.isMining = true;

      // Re-find blocks in case the world changed while paused
      this.blockPositions = findBlocksOfType(this.bot, this.blockToMine);

      if (this.blockPositions.length === 0) {
        this.isMining = false;
        return this.onResolution(
          new MineBlocksResults.PartialSuccess(
            this.blockToMine,
            this.currentQuantity,
            this.targetQuantity
          )
        );
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
        await this.bot.equip(this.bestTool, "hand");
      }

      // Mine blocks until we reach the target quantity or run out of blocks
      while (
        this.currentQuantity < this.targetQuantity &&
        this.blockPositions.length > 0 &&
        this.isMining
      ) {
        const blockToMine = this.blockPositions.shift();

        // If block is still valid (not air, etc.)
        if (blockToMine.name === this.blockToMine) {
          try {
            // Start digging
            await this.bot.dig(blockToMine);

            // If we get here, the block was successfully mined
            this.currentQuantity++;

            // If we need more blocks, update nearby blocks
            if (
              this.currentQuantity < this.targetQuantity &&
              this.blockPositions.length < 5
            ) {
              const newBlocks = findBlocksOfType(this.bot, this.blockToMine);
              this.blockPositions = [...newBlocks];
            }
          } catch (error) {
            console.error(`Error mining block:`, error);
            // Continue to the next block
          }
        }
      }

      if (this.bestTool != null) {
        // allows the item's usage to be updated in the inventory, so we can monitor tool durability usage.
        await once(this.bot.inventory, "updateSlot");

      } // ignore since no durability change. We don't care about picking up the item.

      // Resolve with the appropriate result
      this.isMining = false;

      if (this.currentQuantity === 0) {
        return this.onResolution(
          new MineBlocksResults.BlockNotInSurroundings(this.blockToMine)
        );
      } else if (this.currentQuantity < this.targetQuantity) {
        return this.onResolution(
          new MineBlocksResults.PartialSuccess(
            this.blockToMine,
            this.currentQuantity,
            this.targetQuantity
          )
        );
      } else {
        return this.onResolution(
          new MineBlocksResults.Success(this.blockToMine, this.currentQuantity)
        );
      }
    } catch (error) {
      console.error(`Error in doMining:`, error);
      this.isMining = false;

      if (this.currentQuantity > 0) {
        return this.onResolution(
          new MineBlocksResults.PartialSuccess(
            this.blockToMine,
            this.currentQuantity,
            this.targetQuantity
          )
        );
      }

      return this.onResolution(
        new MineBlocksResults.BlockNotInSurroundings(this.blockToMine)
      );
    }
  }
}

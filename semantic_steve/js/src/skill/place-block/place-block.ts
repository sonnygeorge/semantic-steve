import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { Vec3 } from "vec3";
import type { Block as PBlock } from "prismarine-block";
import { PlaceBlockResults } from "./results";
import { isBlockVisible } from "../../utils";

/**
 * Check if coordinates are within a reasonable distance
 * @param bot The bot instance
 * @param coordinates Target coordinates
 * @param maxDistance Maximum allowed distance
 * @returns True if the coordinates are within range, false otherwise
 */
function areCoordinatesInRange(
  bot: Bot,
  coordinates: Vec3,
  maxDistance = 4,
): boolean {
  const distance = bot.entity.position.distanceTo(coordinates);
  return distance <= maxDistance;
}

export class PlaceBlock extends Skill {
  public static readonly TIMEOUT_MS: number = 7000; // 7 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "placeBlock",
    signature:
      "placeBlock(block: string, atCoordinates?: [number, number, number])",
    docstring: `
        /**
         * Attempts to place a block at the specified coordinates, assuming these
         * coordinates are within the immediate surroundings.
         * @param block - The block to place.
         * @param atCoordinates - Optional target coordinates for block placement.
         * Defaults to an arbitrary location adjacent to the player.
         */
      `,
  };

  private isPlacing: boolean = false;
  private blockId: number = -1;
  private blockName: string = "";
  private targetPosition: Vec3 | null = null;
  private inventoryItem: any = null;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(
    block: string,
    atCoordinates?: [number, number, number],
  ): Promise<void> {
    this.isPlacing = true;
    this.blockName = block;
    this.targetPosition = null;

    try {
      // Check if the block is valid and get its ID
      const blockInfo = this.bot.registry.blocksByName[block];
      if (!blockInfo) {
        this.isPlacing = false;
        return this.onResolution(new PlaceBlockResults.InvalidBlock(block));
      }

      this.blockId = blockInfo.id;

      // Check if we have the block in inventory
      this.inventoryItem = this.bot.inventory.items().find(
        (item) =>
          item.name === block ||
          item.name === block + "_block" || // Handle special cases like 'diamond' vs 'diamond_block'
          block === item.name + "_block", // Handle reverse case
      );

      if (!this.inventoryItem) {
        this.isPlacing = false;
        return this.onResolution(
          new PlaceBlockResults.BlockNotInInventory(block),
        );
      }

      // Determine target position
      if (atCoordinates) {
        this.targetPosition = new Vec3(
          atCoordinates[0],
          atCoordinates[1],
          atCoordinates[2],
        );

        // Check if coordinates are within range
        if (!areCoordinatesInRange(this.bot, this.targetPosition)) {
          this.isPlacing = false;
          return this.onResolution(new PlaceBlockResults.CoordinatesTooFar());
        }
      } else {
        // If no coordinates provided, place block right in front of the bot
        const botPos = this.bot.entity.position.clone();
        const yaw = this.bot.entity.yaw;

        // Calculate position 1 block in front of the bot based on yaw
        const dx = -Math.sin(yaw);
        const dz = -Math.cos(yaw);

        this.targetPosition = new Vec3(
          Math.floor(botPos.x + Math.round(dx)),
          Math.floor(botPos.y),
          Math.floor(botPos.z + Math.round(dz)),
        );
      }

      // Start placing
      return this.doPlacing();
    } catch (error) {
      console.error(`Error in placeBlock:`, error);
      this.isPlacing = false;

      if (this.targetPosition) {
        return this.onResolution(
          new PlaceBlockResults.FailureNoAdjacentBlocks(
            block,
            `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
          ),
        );
      } else {
        return this.onResolution(
          new PlaceBlockResults.BlockNotInInventory(block),
        );
      }
    }
  }

  public async pause(): Promise<void> {
    if (this.isPlacing) {
      this.isPlacing = false;
      console.log(`Pausing '${PlaceBlock.METADATA.name}'`);
    }
    return Promise.resolve();
  }

  public async resume(): Promise<void> {
    if (!this.isPlacing && this.blockId !== -1 && this.targetPosition) {
      console.log(`Resuming '${PlaceBlock.METADATA.name}'`);

      // Check if the target position is still in range
      if (!areCoordinatesInRange(this.bot, this.targetPosition)) {
        return this.onResolution(new PlaceBlockResults.CoordinatesTooFar());
      }

      // Check if we still have the block in inventory
      this.inventoryItem = this.bot.inventory
        .items()
        .find(
          (item) =>
            item.name === this.blockName ||
            item.name === this.blockName + "_block" ||
            this.blockName === item.name + "_block",
        );

      if (!this.inventoryItem) {
        return this.onResolution(
          new PlaceBlockResults.BlockNotInInventory(this.blockName),
        );
      }

      this.isPlacing = true;
      return this.doPlacing();
    }
    return Promise.resolve();
  }

  /**
   * Helper method that performs the actual block placement
   * Called by both invoke and resume
   */
  private async doPlacing(): Promise<void> {
    try {
      if (!this.isPlacing || !this.targetPosition || !this.inventoryItem) {
        return Promise.resolve();
      }

      // Equip the block
      await this.bot.equip(this.inventoryItem, "hand");

      // Get the current block at target position
      const targetBlock = this.bot.blockAt(this.targetPosition);
      if (!targetBlock) {
        this.isPlacing = false;
        return this.onResolution(
          new PlaceBlockResults.FailureNoAdjacentBlocks(
            this.blockName,
            `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
          ),
        );
      }

      // Find an adjacent block to use as reference for placement
      const adjacentOffsets = [
        new Vec3(0, -1, 0), // Below
        new Vec3(0, 1, 0), // Above
        new Vec3(-1, 0, 0), // West
        new Vec3(1, 0, 0), // East
        new Vec3(0, 0, -1), // North
        new Vec3(0, 0, 1), // South
      ];

      let referenceBlock: PBlock | null = null;
      let faceVector: Vec3 | null = null;

      for (const offset of adjacentOffsets) {
        const adjacentPos = this.targetPosition.clone().add(offset);
        const adjacentBlock = this.bot.blockAt(adjacentPos);

        // Skip if the adjacent block doesn't exist or is air
        if (!adjacentBlock || adjacentBlock.name === "air") {
          continue;
        }

        if (!isBlockVisible(this.bot, adjacentBlock, adjacentPos)) {
          continue;
        }

        // Use this block as reference with the opposite face vector
        referenceBlock = adjacentBlock;
        faceVector = offset.scaled(-1);
        break;
      }

      if (!referenceBlock || !faceVector) {
        this.isPlacing = false;
        return this.onResolution(
          new PlaceBlockResults.FailureNoAdjacentBlocks(
            this.blockName,
            `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
          ),
        );
      }

      // Place the block
      await this.bot.placeBlock(referenceBlock, faceVector);

      // Successful placement
      this.isPlacing = false;
      return this.onResolution(
        new PlaceBlockResults.Success(
          this.blockName,
          `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
        ),
      );
    } catch (error) {
      console.error(`Error in doPlacing:`, error);
      this.isPlacing = false;

      return this.onResolution(
        new PlaceBlockResults.FailureNoAdjacentBlocks(
          this.blockName,
          this.targetPosition
            ? `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`
            : "unknown",
        ),
      );
    }
  }
}

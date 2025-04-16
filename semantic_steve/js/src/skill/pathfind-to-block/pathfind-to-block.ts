import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { PathfindToCoordinatesResults } from "../pathfind-to-coordinates/results";
import { PathfindToBlockResults } from "./results";
import { InvalidThingError } from "../../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { SkillResult } from "../../types";
import { Block } from "../../thing/block";

export class PathfindToBlock extends Skill {
  public static readonly TIMEOUT_MS: number = 25000; // 25 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "pathfindToBlock",
    signature: "pathfindToBlock(blockName: string)",
    docstring: `
      /**
       * Attempt to pathfind to a specific block type if it is visible in the bot's surroundings.
       * If the block is not visible, the skill will fail immediately.
       * 
       * This skill is a specialized version of pathfindToCoordinates that only works
       * when a block with the given name is found in the bot's surroundings.
       * 
       * @param blockName - The name of the block to pathfind to (e.g., "stone", "oak_log").
       */
    `,
  };

  private pathfindToCoordinates: PathfindToCoordinates;
  private blockName: string = "";
  private blockCoords: Vec3 | null = null;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.pathfindToCoordinates = new PathfindToCoordinates(
      bot,
      this.handlePathfindingResult.bind(this)
    );
  }

  private handlePathfindingResult(
    result: SkillResult,
    envStateIsHydrated?: boolean
  ): void {
    assert(this.blockCoords);
    
    // Map PathfindToCoordinates results to our own result types
    if (result instanceof PathfindToCoordinatesResults.Success) {
      const successResult = new PathfindToBlockResults.Success(
        this.blockCoords,
        this.blockName
      );
      this.onResolution(successResult, envStateIsHydrated);
    } 
    else if (result instanceof PathfindToCoordinatesResults.PartialSuccess) {
      const partialResult = new PathfindToBlockResults.PartialSuccess(
        this.bot.entity.position,
        this.blockCoords,
        this.blockName
      );
      this.onResolution(partialResult, envStateIsHydrated);
    }
    else {
      // For other result types, just pass them through
      this.onResolution(result, envStateIsHydrated);
    }
  }

  private resolveBlockNotFound(blockName: string): void {
    const result = new PathfindToBlockResults.BlockNotFound(blockName);
    this.onResolution(result);
  }

  private resolveInvalidBlock(blockName: string): void {
    const result = new PathfindToBlockResults.InvalidBlock(blockName);
    this.onResolution(result);
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  public async invoke(blockName: string): Promise<void> {
    this.blockName = blockName;
    this.blockCoords = null;
    
    try {
      // Create the block entity to check if it's a valid thing type
      const block = this.bot.thingFactory.createThing(blockName, Block);
      
      // Ensure the block is actually a Block
      if (!(block instanceof Block)) {
        this.resolveInvalidBlock(blockName);
        return;
      }

      // Make sure we have fresh environment state data
      this.bot.envState.hydrate();
      
      // Check if the block is visible and get its coordinates
      const coords = await block.locateNearest();
      
      if (!coords) {
        // Block not found in surroundings
        this.resolveBlockNotFound(blockName);
        return;
      }
      
      // Store the block coordinates for use in result generation
      this.blockCoords = coords.clone();
      
      // Invoke pathfindToCoordinates with the block's coordinates
      await this.pathfindToCoordinates.invoke([
        coords.x,
        coords.y,
        coords.z
      ]);
      
    } catch (error) {
      if (error instanceof InvalidThingError) {
        this.resolveInvalidBlock(blockName);
      } else {
        // Re-throw any other errors
        throw error;
      }
    }
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PathfindToBlock.METADATA.name}'`);
    await this.pathfindToCoordinates.pause();
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${PathfindToBlock.METADATA.name}'`);
    await this.pathfindToCoordinates.resume();
  }
}
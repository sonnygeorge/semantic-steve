import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { PathfindToCoordinatesResults } from "../pathfind-to-coordinates/results";
import { PathfindToItemResults } from "./results";
import { InvalidThingError } from "../../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { SkillResult } from "../../types";
import { ItemEntity } from "../../thing/itemEntity";
import type { Item as PItem } from "prismarine-item";

export class PathfindToItem extends Skill {
  public static readonly TIMEOUT_MS: number = 25000; // 25 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "pathfindToItem",
    signature: "pathfindToItem(itemName: string)",
    docstring: `
      /**
       * Attempt to pathfind to a specific item if it is visible in the bot's surroundings.
       * If the item is not visible, the skill will fail immediately.
       * 
       * This skill is a specialized version of pathfindToCoordinates that only works
       * when an item with the given name is found in the bot's surroundings.
       * 
       * @param itemName - The name of the item to pathfind to (e.g., "diamond", "apple").
       */
    `,
  };

  private pathfindToCoordinates: PathfindToCoordinates;
  private itemName: string = "";
  private itemCoords: Vec3 | null = null;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.pathfindToCoordinates = new PathfindToCoordinates(bot, this.handlePathfindingResult.bind(this));
  }

  private handlePathfindingResult(result: SkillResult, envStateIsHydrated?: boolean): void {
    assert(this.itemCoords);

    // Map PathfindToCoordinates results to our own result types
    if (result instanceof PathfindToCoordinatesResults.Success) {
      const successResult = new PathfindToItemResults.Success(this.itemCoords, this.itemName);
      this.onResolution(successResult, envStateIsHydrated);
    } else if (result instanceof PathfindToCoordinatesResults.PartialSuccess) {
      const partialResult = new PathfindToItemResults.PartialSuccess(this.bot.entity.position, this.itemCoords, this.itemName);
      this.onResolution(partialResult, envStateIsHydrated);
    } else {
      // For other result types, just pass them through
      this.onResolution(result, envStateIsHydrated);
    }
  }

  private resolveItemNotFound(itemName: string): void {
    const result = new PathfindToItemResults.ItemNotFound(itemName);
    this.onResolution(result);
  }

  private resolveInvalidItem(itemName: string): void {
    const result = new PathfindToItemResults.InvalidItem(itemName);
    this.onResolution(result);
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  public async invoke(itemName: string): Promise<void> {
    this.itemName = itemName;
    this.itemCoords = null;

    try {
      // Create the item entity to check if it's a valid thing type
      const itemEntity = this.bot.thingFactory.createThing(itemName, ItemEntity);

      // Ensure the item is actually an ItemEntity
      if (!(itemEntity instanceof ItemEntity)) {
        this.resolveInvalidItem(itemName);
        return;
      }

      // Make sure we have fresh environment state data
      this.bot.envState.hydrate();

      // Check if the item is visible and get its coordinates
      const coords = await itemEntity.locateNearest();

      if (!coords) {
        // Item not found in surroundings
        this.resolveItemNotFound(itemName);
        return;
      }

      // Store the item coordinates for use in result generation
      this.itemCoords = coords.clone();

      // Invoke pathfindToCoordinates with the item's coordinates
      await this.pathfindToCoordinates.invoke([coords.x, coords.y, coords.z]);

      await new Promise((res, rej) => {
        // await updateSlot event listener
        const listener = (slot: number, oldItem: PItem | null, newItem: PItem | null) => {
          // Check if the item in the slot is the one we are looking for
          if (newItem && newItem.name === this.itemName) {
            res(true); // Resolve the promise
            this.bot.inventory.off("updateSlot", listener); // Remove the listener
          } else if (oldItem && oldItem.name === this.itemName) {
            rej(new Error("Item was removed from inventory before reaching it."));
            this.bot.inventory.off("updateSlot", listener); // Remove the listener
          }
        };

        this.bot.inventory.on("updateSlot", listener);
        setTimeout(() => {
          rej(new Error("Timed out waiting for item to be picked up."));
          this.bot.inventory.off("updateSlot", listener); // Remove the listener
        }, PathfindToItem.TIMEOUT_MS);
      });
    } catch (error) {
      if (error instanceof InvalidThingError) {
        this.resolveInvalidItem(itemName);
      } else {
        // Re-throw any other errors
        throw error;
      }
    }
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PathfindToItem.METADATA.name}'`);
    await this.pathfindToCoordinates.pause();
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${PathfindToItem.METADATA.name}'`);
    await this.pathfindToCoordinates.resume();
  }
}

import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { Approach } from "../approach/approach";
import { isApproachResult } from "../approach/results";
import { Vicinity } from "../../env-state/surroundings/types";
import { PickupItemResults } from "./results";
import { ItemEntity } from "../../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { InvalidThingError, SkillResult } from "../../types";
import { ITEM_PICKUP_WAIT_MS } from "../../constants";
import { asyncSleep } from "../../utils/generic";
import { PathfindToCoordinatesResults } from "../pathfind-to-coordinates/results";

export class PickupItem extends Skill {
  public static readonly TIMEOUT_MS: number = 23000; // 23 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "pickupItem",
    signature: "pickupItem(item: string, direction?: string)",
    docstring: `
      /**
       * Attempt to walk over to an item and pick it up. Requires that the item be visible
       * in the bot's immediate or distant surroundings.
       *
       * @param item - The name of the item to pick up (e.g., "diamond", "apple").
       * @param direction - Must be provided if you want to pick up an item from the
       * distant surroundings. The direction of the distant surroundings in which the item
       * is located.
       */
    `,
  };

  private approach: Approach;
  private pathfindToCoordinates: PathfindToCoordinates;
  private itemEntity?: ItemEntity;
  private itemTotalAtPathingStart?: number;
  private targetItemCoords?: Vec3;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.approach = new Approach(bot, this.resolveAfterPathfinding.bind(this));
    this.pathfindToCoordinates = new PathfindToCoordinates(
      bot,
      this.resolveAfterPathfinding.bind(this),
    );
  }

  private async resolveAfterPathfinding(
    result: SkillResult,
    envStateIsHydrated?: boolean,
  ): Promise<void> {
    assert(this.itemEntity);

    // Propogate result if we are resolving from Approach
    if (isApproachResult(result)) {
      this.onResolution(result, envStateIsHydrated);
      return;
    }

    // Otherwise, we are resolving from PathfindToCoordinates
    assert(this.itemTotalAtPathingStart);
    assert(this.targetItemCoords);

    const vicinityOfOriginalTargetCoords =
      this.bot.envState.surroundings.getVicinityForPosition(
        this.targetItemCoords,
      );

    if (vicinityOfOriginalTargetCoords !== Vicinity.IMMEDIATE_SURROUNDINGS) {
      const result =
        new PickupItemResults.TargetCoordsNoLongerInImmediateSurroundings(
          this.itemEntity.name,
        );
      this.onResolution(result, envStateIsHydrated);
      return;
    }

    // Wait for a bit to make sure the item is picked up
    await asyncSleep(ITEM_PICKUP_WAIT_MS);
    if (result instanceof PathfindToCoordinatesResults.Success) {
      const curItemTotal = this.itemEntity.getTotalCountInInventory();
      const netItemGain = curItemTotal - this.itemTotalAtPathingStart;
      const result = new PickupItemResults.SuccessImmediateSurroundings(
        this.itemEntity.name,
        netItemGain,
      );
      this.onResolution(result, envStateIsHydrated);
    } else {
      const result = new PickupItemResults.CouldNotProgramaticallyVerify(
        this.itemEntity.name,
      );
      this.onResolution(result, envStateIsHydrated);
    }
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  public async invoke(item: string, direction?: string): Promise<void> {
    try {
      this.itemEntity = new ItemEntity(this.bot, item);
    } catch (err) {
      if (err instanceof InvalidThingError) {
        const result = new PickupItemResults.InvalidItem(item);
        this.onResolution(result);
        return;
      }
    }
    assert(this.itemEntity); // Obviously true (above), but TS compiler doesn't know this

    // If a direction is provided, we can just use approach
    if (direction) {
      this.approach.invoke(this.itemEntity, direction);
    } else {
      // We need to pathfind to the item in the immediate surroundings
      this.targetItemCoords =
        await this.itemEntity.locateNearestInImmediateSurroundings();

      if (!this.targetItemCoords) {
        const result = new PickupItemResults.NotInImmediateSurroundings(
          this.itemEntity.name,
        );
        this.onResolution(result);
        return;
      }

      this.itemTotalAtPathingStart = this.itemEntity.getTotalCountInInventory();

      await this.pathfindToCoordinates.invoke([
        this.targetItemCoords.x,
        this.targetItemCoords.y,
        this.targetItemCoords.z,
      ]);
    }
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PickupItem.METADATA.name}'`);
    await this.pathfindToCoordinates.pause();
    await this.approach.pause();
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${PickupItem.METADATA.name}'`);
    await this.pathfindToCoordinates.resume();
    await this.approach.resume();
  }
}

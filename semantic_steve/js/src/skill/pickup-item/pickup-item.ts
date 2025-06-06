import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { Approach } from "../approach/approach";
import { isApproachResult } from "../approach/results";
import { Vicinity } from "../../env-state/surroundings/types";
import { PickupItemResults } from "./results";
import { ItemType } from "../../thing-type";
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

  private activeSubskill?: PathfindToCoordinates | Approach;
  private itemEntity?: ItemType;
  private itemTotalAtPathingStart?: number;
  private targetItemCoords?: Vec3;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private async resolveFromSubskillResolution(
    result: SkillResult,
    envStateIsHydrated?: boolean
  ): Promise<void> {
    assert(this.itemEntity);
    assert(this.activeSubskill);
    this.activeSubskill = undefined;

    // Propogate result if we are resolving from Approach
    if (isApproachResult(result)) {
      this.resolve(result, envStateIsHydrated);
      return;
    }

    // Otherwise, we are resolving from PathfindToCoordinates
    assert(this.itemTotalAtPathingStart !== undefined);
    assert(this.targetItemCoords);

    const vicinityOfOriginalTargetCoords =
      this.bot.envState.surroundings.getVicinityForPosition(
        this.targetItemCoords
      );

    if (vicinityOfOriginalTargetCoords !== Vicinity.IMMEDIATE_SURROUNDINGS) {
      const result =
        new PickupItemResults.TargetCoordsNoLongerInImmediateSurroundings(
          this.itemEntity.name
        );
      this.resolve(result, envStateIsHydrated);
      return;
    }

    // Wait for a bit to make sure the item is picked up
    await asyncSleep(ITEM_PICKUP_WAIT_MS);

    if (result instanceof PathfindToCoordinatesResults.Success) {
      const curItemTotal = this.itemEntity.getTotalCountInInventory();
      const netItemGain = curItemTotal - this.itemTotalAtPathingStart;
      const result = new PickupItemResults.SuccessImmediateSurroundings(
        this.itemEntity.name,
        netItemGain
      );
      this.resolve(result, envStateIsHydrated);
    } else {
      const result = new PickupItemResults.CouldNotProgramaticallyVerify(
        this.itemEntity.name
      );
      this.resolve(result, envStateIsHydrated);
    }
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    item: string | ItemType,
    direction?: string
  ): Promise<void> {
    // Validate the item string
    if (typeof item === "string") {
      try {
        this.itemEntity = new ItemType(this.bot, item);
      } catch (err) {
        if (err instanceof InvalidThingError) {
          const result = new PickupItemResults.InvalidItem(item);
          this.resolve(result);
          return;
        } else {
          throw err;
        }
      }
    } else {
      this.itemEntity = item;
    }

    if (direction) {
      // If a direction is provided, we can just use/invoke approach
      this.activeSubskill = new Approach(
        this.bot,
        this.resolveFromSubskillResolution.bind(this)
      );
      this.activeSubskill.invoke(this.itemEntity, direction);
    } else {
      // Else, we need to pathfind to the item in the immediate surroundings
      this.targetItemCoords =
        await this.itemEntity.locateNearestInImmediateSurroundings();
      if (!this.targetItemCoords) {
        const result = new PickupItemResults.NotInImmediateSurroundings(
          this.itemEntity.name
        );
        this.resolve(result);
        return;
      }
      this.itemTotalAtPathingStart = this.itemEntity.getTotalCountInInventory();
      // Invoke pathfindToCoordinates
      this.activeSubskill = new PathfindToCoordinates(
        this.bot,
        this.resolveFromSubskillResolution.bind(this)
      );
      await this.activeSubskill.invoke(this.targetItemCoords);
    }
  }

  public async doPause(): Promise<void> {
    if (this.activeSubskill) {
      await this.activeSubskill.pause();
    }
  }

  public async doResume(): Promise<void> {
    if (this.activeSubskill) {
      await this.activeSubskill.resume();
    }
  }

  public async doStop(): Promise<void> {
    if (this.activeSubskill) {
      await this.activeSubskill.stop();
      this.activeSubskill = undefined;
    }
  }
}

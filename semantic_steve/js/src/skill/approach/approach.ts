import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { Vicinity, Direction } from "../../env-state/surroundings/types";
import { ApproachResults } from "./results";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { InvalidThingError, SkillResult } from "../../types";
import { Thing, SUPPORTED_THING_TYPES, ItemEntity } from "../../thing";
import { PathfindToCoordinatesResults } from "../pathfind-to-coordinates/results";
import { ITEM_PICKUP_WAIT_MS } from "../../constants";
import { asyncSleep } from "../../utils/generic";

export class Approach extends Skill {
  public static readonly TIMEOUT_MS: number = 23000; // 23 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "approach",
    signature:
      "approach(thing: string, direction: string, stopIfFound?: string[])",
    docstring: `
      /**
       * Attempt to pathfind to something visible in a direction of the bot's distant
       * surroundings.
       *
       * @param thing - The name of the thing to approach.
       * @param direction - The direction of the distant surroundings in which the thing
       * you want to approach is located.
       * @param stopIfFound - An optional array of strings representing things that, if
       * found, should cause the pathdinding to stop (e.g., useful things).
       */
    `,
  };

  private activeSubskill?: Skill;
  private thing?: Thing;
  private itemTotalAtPathingStart?: number;
  private targetThingCoords?: Vec3;
  private direction?: Direction;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private async resolveFromSubskillResolution(
    result: SkillResult,
    envStateIsHydrated?: boolean,
  ): Promise<void> {
    assert(this.thing);
    assert(this.targetThingCoords);
    assert(this.direction);

    // Handle if stopIfFound thing was found
    if (
      result instanceof
      PathfindToCoordinatesResults.FoundThingInDistantSurroundings
    ) {
      result = new ApproachResults.FoundThingInDistantSurroundings(
        this.thing.name,
        result.foundThingName,
      );
      this.resolve(result, envStateIsHydrated);
      return;
    } else if (
      result instanceof
      PathfindToCoordinatesResults.FoundThingInImmediateSurroundings
    ) {
      result = new ApproachResults.FoundThingInImmediateSurroundings(
        this.thing.name,
        result.foundThingName,
      );
      this.resolve(result, envStateIsHydrated);
      return;
    }

    // Otherwise, check to see if the approach was successful & handle
    const vicinityOfOriginalTargetCoords =
      this.bot.envState.surroundings.getVicinityForPosition(
        this.targetThingCoords,
      );

    if (vicinityOfOriginalTargetCoords == Vicinity.IMMEDIATE_SURROUNDINGS) {
      if (this.thing instanceof ItemEntity) {
        assert(this.itemTotalAtPathingStart !== undefined);
        // Wait for a bit to make sure the item is picked up
        await asyncSleep(ITEM_PICKUP_WAIT_MS);
        const curItemTotal = this.thing.getTotalCountInInventory();
        const netItemGain = curItemTotal - this.itemTotalAtPathingStart;
        result = new ApproachResults.SuccessItemEntity(
          this.thing.name,
          this.direction,
          netItemGain,
        );
        this.resolve(result, envStateIsHydrated);
      } else {
        const successResult = new ApproachResults.Success(
          this.thing.name,
          this.direction,
        );
        this.resolve(successResult, envStateIsHydrated);
      }
    } else {
      const failureResult = new ApproachResults.Failure(this.thing.name);
      this.resolve(failureResult, envStateIsHydrated);
    }
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    thing: string | Thing,
    direction: string,
    stopIfFound?: string[],
  ): Promise<void> {
    if (typeof thing === "string") {
      try {
        this.thing = this.bot.thingFactory.createThing(thing);
      } catch (err) {
        if (err instanceof InvalidThingError) {
          const result = new ApproachResults.InvalidThing(
            thing,
            SUPPORTED_THING_TYPES.toString(),
          );
          this.resolve(result);
          return;
        }
      }
    } else {
      this.thing = thing;
    }
    assert(typeof this.thing === "object"); // Obviously true (above), but TS compiler doesn't know this

    if (!Object.values(Direction).includes(direction as Direction)) {
      const result = new ApproachResults.InvalidDirection(direction);
      this.resolve(result);
      return;
    }
    this.direction = direction as Direction;

    // Make sure we have fresh environment state data
    this.bot.envState.hydrate();

    // Check if the thing is visible in distant surroundings in given direction and get its coordinates
    this.targetThingCoords =
      await this.thing?.locateNearestInDistantSurroundings(this.direction);

    if (!this.targetThingCoords) {
      const result = new ApproachResults.ThingNotInDistantSurroundingsDirection(
        this.thing.name,
        direction,
      );
      this.resolve(result);
      return;
    }

    // If the thing is an ItemEntity, record how many the bot has at the start of pathfinding
    if (this.thing instanceof ItemEntity) {
      this.itemTotalAtPathingStart = this.thing.getTotalCountInInventory();
    }

    // Invoke pathfinding to the coordinates of the thing
    this.activeSubskill = new PathfindToCoordinates(
      this.bot,
      (result: SkillResult) => {
        this.resolveFromSubskillResolution(result, true);
      },
    );
    await this.activeSubskill.invoke(this.targetThingCoords, stopIfFound);
  }

  public async doPause(): Promise<void> {
    assert(this.activeSubskill);
    await this.activeSubskill.pause();
  }

  public async doResume(): Promise<void> {
    assert(this.activeSubskill);
    await this.activeSubskill.resume();
  }

  public async doStop(): Promise<void> {
    assert(this.activeSubskill);
    await this.activeSubskill.stop();
  }
}

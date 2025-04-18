import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { Vicinity, Direction } from "../../env-state/surroundings/types";
import { ApproachResults } from "./results";
import { InvalidThingError } from "../../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { SkillResult } from "../../types";
import { Thing, SUPPORTED_THING_TYPES } from "../../thing";

export class Approach extends Skill {
  public static readonly TIMEOUT_MS: number = 23000; // 23 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "approach",
    signature: "approach(thing: string)",
    docstring: `
      /**
       * Attempt to pathfind to something visible in a direction of the bot's distant
       * surroundings.
       *
       * @param thing - The name of the thing to approach.
       * @param direction - The direction of the distant surroundings in which the thing
       * you want to approach is located.
       */
    `,
  };

  private pathfindToCoordinates: PathfindToCoordinates;
  private thing?: Thing;
  private targetThingCoords?: Vec3;
  private direction?: Direction;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.pathfindToCoordinates = new PathfindToCoordinates(
      bot,
      this.resolveNaturally.bind(this),
    );
  }

  private resolveNaturally(
    result: SkillResult,
    envStateIsHydrated?: boolean,
  ): void {
    assert(this.thing);
    assert(this.targetThingCoords);
    assert(this.direction);

    const vicinityOfTargetThing =
      this.bot.envState.surroundings.getVicinityForPosition(
        this.targetThingCoords,
      );

    if (vicinityOfTargetThing == Vicinity.IMMEDIATE_SURROUNDINGS) {
      const successResult = new ApproachResults.Success(
        this.thing.name,
        this.direction,
      );
      this.onResolution(successResult, envStateIsHydrated);
    } else {
      const failureResult = new ApproachResults.Failure(
        this.thing.name,
        result.message,
      );
      this.onResolution(failureResult, envStateIsHydrated);
    }
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  public async invoke(thing: string, direction: string): Promise<void> {
    try {
      this.thing = this.bot.thingFactory.createThing(thing);
    } catch (err) {
      if (err instanceof InvalidThingError) {
        const result = new ApproachResults.InvalidThing(
          thing,
          SUPPORTED_THING_TYPES,
        );
        this.onResolution(result);
        return;
      }
    }

    if (!Object.values(Direction).includes(direction as Direction)) {
      const result = new ApproachResults.InvalidDirection(direction);
      this.onResolution(result);
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
        thing,
        direction,
      );
      return;
    }

    await this.pathfindToCoordinates.invoke([
      this.targetThingCoords.x,
      this.targetThingCoords.y,
      this.targetThingCoords.z,
    ]);
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${Approach.METADATA.name}'`);
    await this.pathfindToCoordinates.pause();
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${Approach.METADATA.name}'`);
    await this.pathfindToCoordinates.resume();
  }
}

import assert from "assert";
import { Vec3 } from "vec3";
import { Bot, BotEvents } from "mineflayer";
import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import { PathfindToCoordinatesResults } from "./results";
import { SUPPORTED_THING_TYPES, ThingType } from "../../thing-type";
import { InvalidThingError, VicinityName } from "../../types";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { getCurrentDimensionYLimits } from "../../utils/misc";
import { MAX_ALLOWED_PATHFINDING_TIME_MS } from "../../constants";

class PathfindingParams {
  public readonly goal: goals.GoalBlock | goals.GoalGetToBlock;
  public readonly targetCoords: Vec3;
  public readonly stopIfFound: ThingType[];

  constructor(bot: Bot, targetCoords: Vec3, stopIfFound: ThingType[]) {
    this.targetCoords = targetCoords;
    this.stopIfFound = stopIfFound;
    const blockAtTargetCoords = bot.world.getBlock(targetCoords.floor());
    if (blockAtTargetCoords !== null && blockAtTargetCoords.name !== "air") {
      this.goal = new goals.GoalGetToBlock(
        targetCoords.x,
        targetCoords.y,
        targetCoords.z
      );
    } else {
      this.goal = new goals.GoalBlock(
        targetCoords.x,
        targetCoords.y,
        targetCoords.z
      );
    }
  }
}

export class PathfindToCoordinates extends Skill {
  public static readonly TIMEOUT_MS: number = MAX_ALLOWED_PATHFINDING_TIME_MS;
  public static readonly METADATA: SkillMetadata = {
    name: "pathfindToCoordinates",
    signature:
      "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])",
    docstring: `
      /**
       * Attempts to pathfind to or near a set of in-dimension coordinates (digging and
       * bridging as needed), stopping early if something from the stopIfFound list
       * becomes visible in the bot's surroundings.
       *
       * TIP: Do not call this function with very distant coordinates, as this will likely
       * result in a timeout. Instead, prefer incremental invocations of this skill for
       * traversing long distances.
       * TIP: Use this function to dig down by calling it with coordinates below the bot's
       * current Y level.
       *
       * @param coordinates - The target coordinates as an array ordered [x, y, z].
       * @param stopIfFound - An optional array of strings representing things that, if
       * found, should cause the pathdinding to stop (e.g., useful things).
       */
    `,
  };

  private pathingParams?: PathfindingParams;
  private activeListeners: {
    event: keyof BotEvents;
    listener: (...args: any[]) => void;
  }[];

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.activeListeners = [];
  }

  // =======================
  // Begin/stop pathfinding
  // =======================

  private beginPathfinding(): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    this.setupListeners();
    this.bot.pathfinder.setGoal(this.pathingParams.goal!);
    console.log("Goal set. Beginning pathfinding...");
  }

  private manuallyStopPathfinder(): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    console.log("Manually stopping pathfinder...");
    this.bot.pathfinder.stop();
    this.cleanupListeners();
  }

  // ==============
  // Misc. helpers
  // ==============

  /**
   * Checks the bot's surroundings for any of the things in the stopIfFound list.
   * If any of them are found, it returns appropriate result. Otherwise, it returns undefined.
   * @returns The result of the check, or undefined if no stopIfFound things are found.
   */
  private async getResultIfAnyStopIfFoundThingInSurroundings(): Promise<
    | PathfindToCoordinatesResults.FoundThingInDistantSurroundings
    | PathfindToCoordinatesResults.FoundThingInImmediateSurroundings
    | undefined
  > {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    for (const thing of this.pathingParams.stopIfFound!) {
      if (await thing.isVisibleInImmediateSurroundings()) {
        return new PathfindToCoordinatesResults.FoundThingInImmediateSurroundings(
          this.pathingParams.targetCoords!,
          thing.name
        );
      } else if (await thing.isVisibleInDistantSurroundings()) {
        return new PathfindToCoordinatesResults.FoundThingInDistantSurroundings(
          this.pathingParams.targetCoords!,
          thing.name
        );
      }
    }
  }

  // ====================
  // Resolvers/listeners
  // ====================

  private resolveInvalidCoords(coords: [number, number, number]): void {
    console.log("Resolving pathfinding as invalid coordinates");
    this.resolve(new PathfindToCoordinatesResults.InvalidCoords(coords));
  }

  private resolveInvalidThing(thingName: string): void {
    console.log("Resolving pathfinding as invalid thing");
    const result = new PathfindToCoordinatesResults.InvalidThing(
      thingName,
      SUPPORTED_THING_TYPES.toString()
    );
    this.resolve(result);
  }

  private resolveThingFound(
    result:
      | PathfindToCoordinatesResults.FoundThingInDistantSurroundings
      | PathfindToCoordinatesResults.FoundThingInImmediateSurroundings
  ): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    console.log("Resolving pathfinding as thing found");
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    this.pathingParams = undefined;
    this.resolve(result);
  }

  private resolvePathfindingPartialSuccess(): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    console.log("Resolving pathfinding as partial success");
    this.cleanupListeners();
    const result = new PathfindToCoordinatesResults.PartialSuccess(
      this.bot.entity.position,
      this.pathingParams.targetCoords!
    );
    this.pathingParams = undefined;
    this.resolve(result);
  }

  private async resolvePathfindingSuccess(): Promise<void> {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    console.log("Resolving pathfinding as success");
    this.cleanupListeners();
    // NOTE: We prefer telling the LLM/user that they stopped early because they found
    // something from stopIfFound, even if they reached their pathfinding goal as well.
    const result =
      (await this.getResultIfAnyStopIfFoundThingInSurroundings()) ??
      new PathfindToCoordinatesResults.Success(
        this.pathingParams.targetCoords!
      );
    this.pathingParams = undefined;
    this.resolve(result);
  }

  private async checkForStopIfFoundThingsAndHandle(
    lastMove: Vec3
  ): Promise<void> {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    if (this.pathingParams.stopIfFound!.length === 0) {
      return;
    }
    const result = await this.getResultIfAnyStopIfFoundThingInSurroundings();
    if (result) {
      this.resolveThingFound(result);
    }
  }

  private checkForStatusWeShouldManuallyStopAndResolveOn(
    path: PartiallyComputedPath
  ): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    if (path.status === "timeout" || path.status === "noPath") {
      console.log(`path.status was '${path.status}'`);

      // This stops the bot from continuing to move along the remainder of partial path
      this.manuallyStopPathfinder();

      if (
        this.bot.envState.surroundings.getVicinityForPosition(
          this.pathingParams.targetCoords!
        ) === VicinityName.IMMEDIATE_SURROUNDINGS
      ) {
        this.resolvePathfindingSuccess();
      } else {
        this.resolvePathfindingPartialSuccess();
      }
    }
  }

  private handlePathStop(): void {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    // As far as I know in my study of mineflayer-pathfinder, 'path_stop' is only emitted
    // in these cases:
    // - When a goal becomes invalid
    // - The pathfind module user calls `pathfinder.stop()`
    // We only want to resolve when the goal becomes invalid, since, e.g. on skill pause
    // (which can result in a 'path_stop' emission), we don't want to resolve the skill.
    if (!this.pathingParams.goal?.isValid()) {
      if (
        this.bot.envState.surroundings.getVicinityForPosition(
          this.pathingParams.targetCoords!
        ) === VicinityName.IMMEDIATE_SURROUNDINGS
      ) {
        this.resolvePathfindingSuccess();
      } else {
        this.resolvePathfindingPartialSuccess();
      }
    }
  }

  // ===========================
  // Setup/cleanup of listeners
  // ===========================

  private setupListener(
    event: keyof BotEvents,
    listener: (...args: any[]) => void
  ): void {
    this.bot.on(event, listener);
    this.activeListeners.push({ event, listener });
  }

  private setupListeners(): void {
    console.log("Setting up pathfinding listeners");
    this.setupListener(
      "goal_reached",
      this.resolvePathfindingSuccess.bind(this)
    );
    this.setupListener(
      "move",
      this.checkForStopIfFoundThingsAndHandle.bind(this)
    );
    this.setupListener(
      "path_update",
      this.checkForStatusWeShouldManuallyStopAndResolveOn.bind(this)
    );
    this.setupListener("path_stop", this.handlePathStop.bind(this));
  }

  private cleanupListeners(): void {
    console.log("Cleaning up pathfinding listeners");
    for (const { event, listener } of this.activeListeners) {
      this.bot.off(event, listener);
    }
    this.activeListeners = []; // Clear the local-state array
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    coords: [number, number, number] | Vec3,
    stopIfFound?: string[]
  ): Promise<void> {
    // Pre-process coordinates
    if (Array.isArray(coords)) {
      coords = new Vec3(coords[0], coords[1], coords[2]);
    }
    const { minY: dimensionBottom, maxY: dimensionTop } =
      getCurrentDimensionYLimits(this.bot);
    if (
      coords.x < -30000000 ||
      coords.x > 30000000 ||
      coords.y < dimensionBottom ||
      coords.y > dimensionTop ||
      coords.z < -30000000 ||
      coords.z > 30000000
    ) {
      this.resolveInvalidCoords([coords.x, coords.y, coords.z]);
      return;
    }
    // Pre-process stopIfFound
    const processedStopIfFound: ThingType[] = [];
    if (stopIfFound?.length) {
      for (const thingName of stopIfFound) {
        try {
          const thing = this.bot.thingTypeFactory.createThingType(thingName);
          processedStopIfFound.push(thing);
        } catch (error) {
          if (error instanceof InvalidThingError) {
            this.resolveInvalidThing(thingName);
            return;
          }
        }
      }
    }
    // Begin pathfinding
    this.pathingParams = new PathfindingParams(
      this.bot,
      coords,
      processedStopIfFound
    );
    this.beginPathfinding();
  }

  public async doPause(): Promise<void> {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    // NOTE: We don't call unsetPathfindingParams (we need to be able to resume)
  }

  public async doResume(): Promise<void> {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    this.beginPathfinding();
  }

  public async doStop(): Promise<void> {
    assert(this.pathingParams, "Shouldn't be called w/out set pathing params");
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    this.pathingParams = undefined;
  }
}

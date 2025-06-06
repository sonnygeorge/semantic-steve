import assert from "assert";
import { Vec3 } from "vec3";
import { Bot, BotEvents } from "mineflayer";
import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import { PathfindToCoordinatesResults } from "./results";
import { SUPPORTED_THING_TYPES, Thing } from "../../thing";
import { InvalidThingError } from "../../types";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { getGoodPathfindingTarget } from "./utils";

const STOP_IF_FOUND_CHECK_THROTTLE_MS = 1800;

export class PathfindToCoordinates extends Skill {
  public static readonly TIMEOUT_MS: number = 25000; // 25 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "pathfindToCoordinates",
    signature:
      "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])",
    docstring: `
      /**
       * Attempt to pathfind to or near a set of in-dimension coordinates (digging and
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

  private targetCoords?: Vec3;
  private stopIfFound: Thing[] = [];
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
    assert(this.targetCoords);
    this.setupListeners();
    const goal: goals.GoalBlock = new goals.GoalBlock(
      this.targetCoords.x,
      this.targetCoords.y,
      this.targetCoords.z,
    );
    this.bot.pathfinder.setGoal(goal);
    console.log("Goal set. Beginning pathfinding...");
  }

  private manuallyStopPathfinder(): void {
    assert(this.targetCoords);
    this.bot.pathfinder.stop();
    this.cleanupListeners();
  }

  // ==============
  // Misc. helpers
  // ==============

  private unsetPathfindingParams(): void {
    this.targetCoords = undefined;
    this.stopIfFound = [];
  }

  /**
   * Checks the bot's surroundings for any of the things in the stopIfFound list.
   * If any of them are found, it returns appropriate result. Otherwise, it returns undefined.
   * @returns The result of the check, or undefined if no stopIfFound things are found.
   */
  private getResultIfAnyStopIfFoundThingInSurroundings():
    | PathfindToCoordinatesResults.FoundThingInDistantSurroundings
    | PathfindToCoordinatesResults.FoundThingInImmediateSurroundings
    | undefined {
    assert(this.targetCoords);
    for (const thing of this.stopIfFound) {
      if (thing.isVisibleInImmediateSurroundings()) {
        return new PathfindToCoordinatesResults.FoundThingInImmediateSurroundings(
          this.targetCoords,
          thing.name,
        );
      } else if (thing.isVisibleInDistantSurroundings()) {
        return new PathfindToCoordinatesResults.FoundThingInDistantSurroundings(
          this.targetCoords,
          thing.name,
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
      SUPPORTED_THING_TYPES.toString(),
    );
    this.resolve(result);
  }

  private resolveThingFound(
    result:
      | PathfindToCoordinatesResults.FoundThingInDistantSurroundings
      | PathfindToCoordinatesResults.FoundThingInImmediateSurroundings,
  ): void {
    console.log("Resolving pathfinding as thing found");
    assert(this.targetCoords);
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    this.unsetPathfindingParams();
    this.resolve(result);
  }

  private resolvePathfindingPartialSuccess(): void {
    console.log("Resolving pathfinding as partial success");
    assert(this.targetCoords);
    this.cleanupListeners();
    const result = new PathfindToCoordinatesResults.PartialSuccess(
      this.bot.entity.position,
      this.targetCoords,
    );
    this.unsetPathfindingParams();
    this.resolve(result);
  }

  private resolvePathfindingSuccess(): void {
    console.log("Resolving pathfinding as success");
    assert(this.targetCoords);
    this.cleanupListeners();
    // NOTE: No throttle since, since we know we always want to hydrate here.
    // (We need to for `getResultIfAnyStopIfFoundThingInSurroundings` and, even if there are
    // no stopIfFound things, we save `onResolution` from having to hydrate it by propagating
    // the optional envStateIsHydrated flag as true.)
    this.bot.envState.hydrate();
    // NOTE: We prefer telling the LLM/user that they stopped early because they found
    // something from stopIfFound, even if they reached their pathfinding goal as well.
    const result =
      this.getResultIfAnyStopIfFoundThingInSurroundings() ??
      new PathfindToCoordinatesResults.Success(this.targetCoords);
    this.unsetPathfindingParams();
    this.resolve(result, true); // NOTE: true = envStateIsHydrated
  }

  private checkForStopIfFoundThingsAndHandle(lastMove: Vec3): void {
    if (this.stopIfFound.length === 0) {
      return;
    }
    this.bot.envState.hydrate(STOP_IF_FOUND_CHECK_THROTTLE_MS);
    const result = this.getResultIfAnyStopIfFoundThingInSurroundings();
    if (result) {
      this.resolveThingFound(result);
    }
  }

  private checkForTimeoutStatusAndHandle(path: PartiallyComputedPath): void {
    if (path.status === "timeout") {
      console.log("path.status was 'timeout'");
      this.resolvePathfindingPartialSuccess();
    }
  }

  private checkForNoPathStatusAndHandle(path: PartiallyComputedPath): void {
    if (path.status === "noPath") {
      console.log("path.status was 'noPath'");
      this.resolvePathfindingPartialSuccess();
    }
  }

  // ===========================
  // Setup/cleanup of listeners
  // ===========================

  private setupListener(
    event: keyof BotEvents,
    listener: (...args: any[]) => void,
  ): void {
    this.bot.on(event, listener);
    this.activeListeners.push({ event, listener });
  }

  private setupListeners(): void {
    console.log("Setting up pathfinding listeners");
    this.setupListener(
      "goal_reached",
      this.resolvePathfindingSuccess.bind(this),
    );
    this.setupListener(
      "move",
      this.checkForStopIfFoundThingsAndHandle.bind(this),
    );
    this.setupListener(
      "path_update",
      this.checkForNoPathStatusAndHandle.bind(this),
    );
    this.setupListener(
      "path_update",
      this.checkForTimeoutStatusAndHandle.bind(this),
    );
    this.setupListener(
      "path_stop",
      this.resolvePathfindingPartialSuccess.bind(this),
    );
  }

  private cleanupListeners(): void {
    console.log("Cleaning up pathfinding listeners");
    for (const { event, listener } of this.activeListeners) {
      this.bot.off(event, listener);
    }
    this.activeListeners = []; // Clear the array
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    coords: [number, number, number] | Vec3,
    stopIfFound?: string[],
  ): Promise<void> {
    // Pre-process coordinates
    if (Array.isArray(coords)) {
      coords = new Vec3(coords[0], coords[1], coords[2]);
    }
    if (
      coords.x < -30000000 ||
      coords.x > 30000000 ||
      // TODO: Change these dynamically if bot in nether or end
      coords.y < -64 ||
      coords.y > 320 ||
      coords.z < -30000000 ||
      coords.z > 30000000
    ) {
      this.resolveInvalidCoords([coords.x, coords.y, coords.z]);
      return;
    }
    this.targetCoords = getGoodPathfindingTarget(this.bot, coords);

    // Pre-process stopIfFound
    this.stopIfFound = [];
    if (stopIfFound?.length) {
      for (const thingName of stopIfFound) {
        try {
          const thing = this.bot.thingFactory.createThing(thingName);
          this.stopIfFound.push(thing);
        } catch (error) {
          if (error instanceof InvalidThingError) {
            this.resolveInvalidThing(thingName);
            return;
          }
        }
      }
    }

    // Begin pathfinding
    this.beginPathfinding();
  }

  public async doPause(): Promise<void> {
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    // NOTE: We don't call unsetPathfindingParams (we need to be able to resume)
  }

  public async doResume(): Promise<void> {
    assert(this.targetCoords);
    this.beginPathfinding();
  }

  public async doStop(): Promise<void> {
    this.cleanupListeners();
    this.manuallyStopPathfinder();
    this.unsetPathfindingParams();
  }
}

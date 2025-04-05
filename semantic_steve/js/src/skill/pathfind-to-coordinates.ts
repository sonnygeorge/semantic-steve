import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import { pathfindToCoordinatesResults } from "../skill-results";
import { SUPPORTED_THING_TYPES, Thing, InvalidThingError } from "../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

const STOP_IF_FOUND_CHECK_THROTTLE_MS = 1300;

export class PathfindToCoordinates extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "pathfindToCoordinates",
    signature:
      "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound: string[])",
    docstring: `
      /**
       * Pathfinds as well as possible to or near a set of coordinates (digging and bridging
       * as needed), stopping early if something from the stopIfFound list becomes visible
       * in the bot's surroundings.
       * @param coordinates - The target coordinates as an array ordered [x, y, z].
       * @param stopIfFound - An array of strings representing the names of things to stop at if found.
       */
    `,
  };
  private targetCoords: Vec3 | null = null;
  private stopIfFound: Thing[] = [];

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
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
      this.targetCoords.z
    );
    this.bot.pathfinder.setGoal(goal);
  }

  private stopPathfinding(): void {
    assert(this.targetCoords);
    this.cleanupListeners();
    this.bot.pathfinder.stop();
  }

  // ===================================
  // Unset params (called by resolvers)
  // ===================================

  private unsetParams(): void {
    this.targetCoords = null;
    this.stopIfFound = [];
  }

  // ==========
  // Resolvers
  // ==========

  private resolveInvalidCoords(coords: [number, number, number]): void {
    const result = pathfindToCoordinatesResults.ERROR_INVALID_COORDS(
      coords.toString()
    );
    this.onResolution(result);
  }

  private resolveInvalidThing(thingName: string): void {
    const result = pathfindToCoordinatesResults.ERROR_INVALID_THING(
      thingName,
      SUPPORTED_THING_TYPES
    );
    this.onResolution(result);
  }

  private resolvePathfindingSuccess(): void {
    assert(this.targetCoords);
    this.unsetParams();
    this.stopPathfinding();
    this.onResolution(
      pathfindToCoordinatesResults.SUCCESS(
        `[${this.targetCoords.x}, ${this.targetCoords.y}, ${this.targetCoords.z}]`
      )
    );
  }

  private resolveThingFound(
    thingName: string,
    wasInImmediateSurroundings: boolean
  ): void {
    assert(this.targetCoords);
    this.unsetParams();
    this.stopPathfinding();
    if (wasInImmediateSurroundings) {
      this.onResolution(
        pathfindToCoordinatesResults.FOUND_THING_IN_IMMEDIATE_SURROUNDINGS(
          `[${this.targetCoords.x}, ${this.targetCoords.y}, ${this.targetCoords.z}]`,
          thingName
        )
      );
    } else {
      this.onResolution(
        pathfindToCoordinatesResults.FOUND_THING_IN_DISTANT_SURROUNDINGS(
          `[${this.targetCoords.x}, ${this.targetCoords.y}, ${this.targetCoords.z}]`,
          thingName
        )
      );
    }
  }

  private resolvePathfindingPartialSuccess(): void {
    assert(this.targetCoords);
    this.unsetParams();
    this.stopPathfinding();
    this.onResolution(
      pathfindToCoordinatesResults.PARTIAL_SUCCESS(
        `[${this.targetCoords.x}, ${this.targetCoords.y}, ${this.targetCoords.z}]`,
        `[${this.bot.entity.position.x}, ${this.bot.entity.position.y}, ${this.bot.entity.position.z}]`
      )
    );
  }

  // ==========
  // Listeners
  // ==========

  private checkForStopIfFoundThingsAndHandle(lastMove: Vec3): void {
    this.bot.envState.hydrate(STOP_IF_FOUND_CHECK_THROTTLE_MS);
    for (const thing of this.stopIfFound) {
      if (thing.isVisibleInImmediateSurroundings()) {
        this.resolveThingFound(thing.name, true);
      } else if (thing.isVisibleInDistantSurroundings()) {
        this.resolveThingFound(thing.name, false);
      }
    }
  }

  private checkForNoPathStatusAndHandle(path: PartiallyComputedPath): void {
    if (path.status === "timeout") {
      this.resolvePathfindingPartialSuccess();
    }
  }

  private checkForTimeoutStatusAndHandle(path: PartiallyComputedPath): void {
    if (path.status === "noPath") {
      this.resolvePathfindingPartialSuccess();
    }
  }

  // ===========================
  // Setup/cleanup of listeners
  // ===========================

  private setupListeners(): void {
    this.bot.on("goal_reached", this.resolvePathfindingSuccess.bind(this));
    this.bot.on("move", this.checkForStopIfFoundThingsAndHandle.bind(this));
    this.bot.on("path_update", this.checkForNoPathStatusAndHandle.bind(this));
    this.bot.on("path_update", this.checkForTimeoutStatusAndHandle.bind(this));
    this.bot.on("path_stop", this.resolvePathfindingPartialSuccess.bind(this));
  }

  private cleanupListeners(): void {
    this.bot.off("goal_reached", this.resolvePathfindingSuccess.bind(this));
    this.bot.off("move", this.checkForStopIfFoundThingsAndHandle.bind(this));
    this.bot.off("path_update", this.checkForNoPathStatusAndHandle.bind(this));
    this.bot.off("path_update", this.checkForTimeoutStatusAndHandle.bind(this));
    this.bot.off("path_stop", this.resolvePathfindingPartialSuccess.bind(this));
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  private async _invoke(
    coords: [number, number, number],
    stopIfFound: string[]
  ): Promise<void> {
    // Pre-process coordinates
    if (!Array.isArray(coords) || coords.length !== 3) {
      this.resolveInvalidCoords(coords);
      return;
    }
    this.targetCoords = new Vec3(coords[0], coords[1], coords[2]);

    // Pre-process stopIfFound
    this.stopIfFound = [];
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

    // Begin pathfinding
    this.beginPathfinding();
  }

  public invoke(
    coordinates: [number, number, number],
    stopIfFound: string[]
  ): void {
    // Add _invoke to the macrotask queue so it kicks off at the next unblocked tick...
    // ...and this function can return immediately (and the SemanticSteve.run loop continues).
    setTimeout(this._invoke.bind(this, coordinates, stopIfFound), 0);
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PathfindToCoordinates.metadata.name}'`);
    this.stopPathfinding(); // NOTE: we don't unset params in order to be able to resume
  }

  public async resume(): Promise<void> {
    assert(this.targetCoords);
    console.log(`Resuming '${PathfindToCoordinates.metadata.name}'`);
    this.beginPathfinding();
  }
}

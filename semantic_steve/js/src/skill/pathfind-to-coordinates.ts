import assert from "assert";
import { Vec3 } from "vec3";
import { Bot, BotEvents } from "mineflayer";
import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import {
  PathfindToCoordinatesResults as Results,
  SkillResult,
} from "../skill-results";
import { SUPPORTED_THING_TYPES, Thing, InvalidThingError } from "../thing";
import { Skill, SkillMetadata, SkillResolutionHandler } from "./skill";

// TODO: Put this through its paces:
// TODO: Why does it not work twice in a row?... Cross-reference Gen's statemachine event handling...
// TODO: Hydrate on completion and check for stopIfFound things one last time to prevent resolving Success when it should resolve ThingFound

const STOP_IF_FOUND_CHECK_THROTTLE_MS = 1800;

export class PathfindToCoordinates extends Skill {
  public static readonly metadata: SkillMetadata = {
    name: "pathfindToCoordinates",
    signature:
      "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])",
    docstring: `
      /**
       * Pathfinds as well as possible to or near a set of coordinates (digging and bridging
       * as needed), stopping early if something from the stopIfFound list becomes visible
       * in the bot's surroundings.
       * @param coordinates - The target coordinates as an array ordered [x, y, z].
       * @param stopIfFound - An optional array of strings representing the names of anything
       * that, if found in the surroundings, makes it worth it to stop pathfinding further.
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
      this.targetCoords.z
    );
    this.bot.pathfinder.setGoal(goal);
    console.log("Goal set. Beginning pathfinding...");
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
    this.targetCoords = undefined;
    this.stopIfFound = [];
  }

  // ==========
  // Resolvers
  // ==========

  private resolveInvalidCoords(coords: [number, number, number]): void {
    console.log("Resolving pathfinding as invalid coordinates");
    this.onResolution(new Results.InvalidCoords(coords));
  }

  private resolveInvalidThing(thingName: string): void {
    console.log("Resolving pathfinding as invalid thing");
    const result = new Results.InvalidThing(thingName, SUPPORTED_THING_TYPES);
    this.onResolution(result);
  }

  private resolvePathfindingSuccess(): void {
    console.log("Resolving pathfinding as success");
    assert(this.targetCoords);
    this.stopPathfinding();
    const result = new Results.Success(this.targetCoords);
    this.unsetParams();
    this.onResolution(result);
  }

  private resolveThingFound(
    thingName: string,
    wasInImmediateSurroundings: boolean
  ): void {
    console.log("Resolving pathfinding as thing found");
    assert(this.targetCoords);
    this.stopPathfinding();
    let result: SkillResult;
    if (wasInImmediateSurroundings) {
      result = new Results.FoundThingInImmediateSurroundings(
        this.targetCoords,
        thingName
      );
    } else {
      result = new Results.FoundThingInDistantSurroundings(
        this.targetCoords,
        thingName
      );
    }
    this.unsetParams();
    this.onResolution(result);
  }

  private resolvePathfindingPartialSuccess(): void {
    console.log("Resolving pathfinding as partial success");
    assert(this.targetCoords);
    this.stopPathfinding();
    const result = new Results.PartialSuccess(
      this.bot.entity.position,
      this.targetCoords
    );
    this.unsetParams();
    this.onResolution(result);
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
      console.log("path.status was 'timeout'");
      this.resolvePathfindingPartialSuccess();
    }
  }

  private checkForTimeoutStatusAndHandle(path: PartiallyComputedPath): void {
    if (path.status === "noPath") {
      console.log("path.status was 'noPath'");
      this.resolvePathfindingPartialSuccess();
    }
  }

  // ===========================
  // Setup/cleanup of listeners
  // ===========================

  private setUpListener(
    event: keyof BotEvents,
    listener: (...args: any[]) => void
  ): void {
    this.bot.on(event, listener);
    this.activeListeners.push({ event, listener });
  }

  private setupListeners(): void {
    console.log("Setting up pathfinding listeners");
    this.setUpListener(
      "goal_reached",
      this.resolvePathfindingSuccess.bind(this)
    );
    this.setUpListener(
      "move",
      this.checkForStopIfFoundThingsAndHandle.bind(this)
    );
    this.setUpListener(
      "path_update",
      this.checkForNoPathStatusAndHandle.bind(this)
    );
    this.setUpListener(
      "path_update",
      this.checkForTimeoutStatusAndHandle.bind(this)
    );
    this.setUpListener(
      "path_stop",
      this.resolvePathfindingPartialSuccess.bind(this)
    );
  }

  private cleanupListeners(): void {
    console.log("Cleaning up pathfinding listeners");
    for (const { event, listener } of this.activeListeners) {
      this.bot.off(event, listener);
    }
    this.activeListeners = []; // Clear the array
  }

  // ==================================
  // Implementation of Skill interface
  // ==================================

  public async invoke(
    coords: [number, number, number],
    stopIfFound?: string[]
  ): Promise<void> {
    // Pre-process coordinates
    if (!Array.isArray(coords) || coords.length !== 3) {
      this.resolveInvalidCoords(coords);
      return;
    }
    this.targetCoords = new Vec3(coords[0], coords[1], coords[2]);

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

  public async pause(): Promise<void> {
    console.log(`Pausing '${PathfindToCoordinates.metadata.name}'`);
    this.stopPathfinding();
    // NOTE: we don't unset params in order to be able to resume
  }

  public async resume(): Promise<void> {
    assert(this.targetCoords);
    console.log(`Resuming '${PathfindToCoordinates.metadata.name}'`);
    this.beginPathfinding();
  }
}

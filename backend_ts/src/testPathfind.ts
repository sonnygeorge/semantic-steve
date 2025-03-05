import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import { goals, Movements } from "mineflayer-pathfinder";
import {
  BotStateMachine,
  getTransition,
  getNestedMachine,
  WebserverBehaviorPositions,
  StateMachineWebserver,
} from "@nxg-org/mineflayer-static-statemachine";
import { Direction, Vicinity, EnvState } from "./envState";
import { StateBehavior } from "@nxg-org/mineflayer-static-statemachine";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";

// Import behaviors we need
import {
  BehaviorWildcard as Wildcard,
  BehaviorIdle as Idle,
  BehaviorExit as Exit,
} from "@nxg-org/mineflayer-static-statemachine/lib/behaviors";

const Start = Exit.clone("Start");

import { StateMachineData } from "@nxg-org/mineflayer-static-statemachine/lib/stateBehavior";

// Event types for surroundings checker
type SurroundingsEvents = {
  thingFound: (thingName: string, vicinity: Vicinity | Direction, envState: EnvState) => void;
  threatDetected: () => void;
};

// Class to handle surroundings checking independent of states
class SurroundingsChecker extends (EventEmitter as new () => TypedEmitter<SurroundingsEvents>) {
  private bot: Bot;
  private stopBlocksIdsToNames: Map<number, string> = new Map();
  private stopBiomeIdsToNames: Map<number, string> = new Map();
  private lastScanTime: number = 0;
  private scanThrottleSeconds: number;

  constructor(bot: Bot, scanThrottleSeconds: number = 3) {
    super();
    this.bot = bot;
    this.scanThrottleSeconds = scanThrottleSeconds;
  }

  setThingsToFind(stopIfFound: string[]): void {
    this.stopBlocksIdsToNames.clear();
    this.stopBiomeIdsToNames.clear();

    for (const thingName of stopIfFound) {
      if (this.bot.registry.blocksByName[thingName]) {
        const blockId = this.bot.registry.blocksByName[thingName].id;
        this.stopBlocksIdsToNames.set(blockId, thingName);
      } else if (this.bot.registry.biomesByName[thingName]) {
        const biomeId = this.bot.registry.biomesByName[thingName].id;
        this.stopBiomeIdsToNames.set(biomeId, thingName);
      } else {
        console.warn(`WARNING: Couldn't recognize '${thingName}'. Make sure you are only passing valid blocks, or biomes!`);
      }
    }
  }

  attachListeners = (): void => {
    this.bot.on("move", this.checkSurroundings);
  };

  detachListeners = (): void => {
    this.bot.off("move", this.checkSurroundings);
  };

  checkSurroundings = (): void => {
    const currentTime = Date.now() / 1000;
    if (currentTime - this.lastScanTime < this.scanThrottleSeconds) return;

    this.lastScanTime = currentTime;

    // Get surroundings
    const [immediate, distant] = this.bot.envState.surroundings.getSurroundings(this.scanThrottleSeconds);

    // Check for blocks in immediate surroundings
    for (const [blockId, blockName] of this.stopBlocksIdsToNames) {
      if (immediate.blocks?.get(blockName) !== null && immediate.blocks?.get(blockName) !== undefined) {
        this.emit("thingFound", blockName, Vicinity.IMMEDIATE, this.bot.envState);
        return;
      }

      // Check in distant surroundings by direction
      for (const direction of Object.values(Direction)) {
        if (
          distant?.get(direction)?.blocksToCounts?.get(blockName) !== null &&
          distant?.get(direction)?.blocksToCounts?.get(blockName) !== undefined
        ) {
          this.emit("thingFound", blockName, direction, this.bot.envState);
          return;
        }
      }
    }

    // Check for biomes in immediate surroundings
    for (const [biomeId, biomeName] of this.stopBiomeIdsToNames) {
      if (immediate.biomes?.has(biomeId)) {
        this.emit("thingFound", biomeName, Vicinity.IMMEDIATE, this.bot.envState);
        return;
      }

      // Check in distant surroundings by direction
      for (const direction of Object.values(Direction)) {
        if (
          distant?.get(direction)?.biomesToClosestCoords?.get(biomeId) !== null &&
          distant?.get(direction)?.biomesToClosestCoords?.get(biomeId) !== undefined
        ) {
          this.emit("thingFound", biomeName, direction, this.bot.envState);
          return;
        }
      }
    }

    // TODO: Check for threats if needed
    // if (threatDetected) {
    //   this.emit('threatDetected');
    // }
  };
}

// State for actual pathfinding
class BehaviorPathfindToCoords extends StateBehavior {
  static stateName = "PathfindToCoords";
  private movements: Movements;
  private goal?: goals.Goal;

  constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
    this.movements = new Movements(bot);
  }

  onStateEntered(): void {
    if (!this.bot.pathfinder) throw Error("Pathfinder is not loaded!");
    if (!this.data.targetPos) throw Error("No target position defined!");

    // Setup listeners for checking surroundings and path status
    this.bot.on("path_update", this.handlePathUpdate);
    this.bot.on("goal_reached", this.handleGoalReached);
    this.data.surroundingsChecker.attachListeners();
    this.data.surroundingsChecker.on("thingFound", this.handleThingFound);

    // Start pathfinding
    this.startMoving(this.data.targetPos);
  }

  update(): void {
    // Nothing needed in update as event handlers handle everything
  }

  onStateExited(): void {
    this.data.surroundingsChecker.detachListeners();
    this.bot.off("path_update", this.handlePathUpdate);
    this.data.surroundingsChecker.off("thingFound", this.handleThingFound);
    this.bot.pathfinder.stop();
  }

  isFinished(): boolean {
    return Boolean(this.data.thingFound) || this.data.pathComplete || this.data.pathFailed;
  }

  thingWasFound(): boolean {
    return Boolean(this.data.thingFound);
  }

  pathWasSuccessful(): boolean {
    return this.data.pathComplete;
  }

  pathFailed(): boolean {
    return this.data.pathFailed;
  }

  handlePathUpdate = (path: any): void => {
    if (path.status === "noPath") {
      this.data.result = `No feasible path to ${this.data.targetPos} found. Are the coordinates reachable?`;
      this.data.pathFailed = true;
    }

    if (path.status === "timeout") {
      this.data.result = `Pathfinding timeout, couldn't find a path to ${this.data.targetPos} in time.`;
      this.data.pathFailed = true;
    }
  };

  handleGoalReached = (goal: goals.Goal): void => {
    if (goal === this.goal) {
      this.data.result = `Pathfinding completed successfully!`;
      this.data.pathComplete = true;
    } else {
      this.data.result = `Pathfinding was terminated! Somehow this event fired on a different goal. Goal: ${this.goal}`;
    }
  };

  handleThingFound = (thingName: string, vicinity: Vicinity | Direction, envState: EnvState): void => {
    this.data.thingFound = { name: thingName, vicinity: vicinity };

    if (vicinity === Vicinity.IMMEDIATE) {
      this.data.result = `Pathfinding terminated early: '${thingName}' found in the immediate surroundings!`;
    } else {
      this.data.result = `Pathfinding terminated early: '${thingName}' found in the distant surroundings!`;
    }
  };

  private async startMoving(pos: Vec3): Promise<void> {
    this.goal = new goals.GoalNear(pos.x, pos.y, pos.z, 2);
    this.bot.pathfinder.setMovements(this.movements);
    this.bot.pathfinder.setGoal(this.goal);
  }
}

// State for handling found item
class BehaviorThingInterrupt extends StateBehavior {
  static stateName = "TargetFound";

  constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
  }

  onStateEntered(): void {
    if (this.data.thingFound) {
      const { name, vicinity } = this.data.thingFound;
      // Could perform additional actions with the found thing here
      this.bot.chat(`Found ${name} in the ${vicinity} vicinity!`);
    }
  }

  isFinished(): boolean {
    return true; // Just a notification state, always finishes right away
  }
}

// State for handling successful pathfinding
class BehaviorPathComplete extends StateBehavior {
  static stateName = "PathComplete";

  constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
  }

  onStateEntered(): void {
    this.bot.chat(`Reached coordinates ${this.data.targetPos}`);
  }

  isFinished(): boolean {
    return true; // Just a notification state, always finishes right away
  }
}

// State for handling pathfinding failure
class BehaviorPathFailed extends StateBehavior {
  static stateName = "PathFailed";

  constructor(bot: Bot, data: StateMachineData) {
    super(bot, data);
  }

  onStateEntered(): void {
    this.bot.chat(`Pathfinding failed: ${this.data.result}`);
  }

  isFinished(): boolean {
    return true; // Just a notification state, always finishes right away
  }
}

// Create the pathfinder state machine
export async function pathfindTo(bot: Bot, wantedPos: Vec3, stopIfFound: string[] = []) {
  // Create shared data object

  const surroundChecker = new SurroundingsChecker(bot);
  const data: StateMachineData = {
    result: null,
    targetPos: wantedPos,
    stopIfFound: stopIfFound,
    thingFound: null,
    pathComplete: false,
    pathFailed: false,
    surroundingsChecker: surroundChecker,
  };

  surroundChecker.setThingsToFind(stopIfFound);

  // Define pathfinder state machine transitions
  const pathfinderTransitions = [
    // If we find what we're looking for
    getTransition("pathfindToThingInterrupt", BehaviorPathfindToCoords, BehaviorThingInterrupt)
      .setShouldTransition((state) => state.isFinished() && state.thingWasFound())
      .build(),

    // If we reach the destination successfully
    getTransition("pathfindToComplete", BehaviorPathfindToCoords, BehaviorPathComplete)
      .setShouldTransition((state) => state.isFinished() && state.pathWasSuccessful())
      .build(),

    // If pathfinding fails
    getTransition("pathfindToFailed", BehaviorPathfindToCoords, BehaviorPathFailed)
      .setShouldTransition((state) => state.isFinished() && state.pathFailed())
      .build(),
  ];

  // Build the nested machine
  const pathfinderMachine = getNestedMachine("pathfinder", pathfinderTransitions, BehaviorPathfindToCoords, [
    BehaviorPathFailed,
    BehaviorPathComplete,
    BehaviorThingInterrupt,
  ]).build();

  // starts root machine immediately upon creation.
  const root = new BotStateMachine({ bot, root: pathfinderMachine, data, autoStart: true });

  await new Promise<void>((resolve) => {
    root.on("stateEntered", (mType, machine, state) => {
      if (state === BehaviorPathFailed || state === BehaviorPathComplete || state === BehaviorThingInterrupt) {
        resolve();
      }
    });
  });

  return data.result;
}

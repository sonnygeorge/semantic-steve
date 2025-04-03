// import type { Bot } from "mineflayer";
// import { goals, Movements } from "mineflayer-pathfinder";
// import {
//   BotStateMachine,
//   getTransition,
//   getNestedMachine,
//   // WebserverBehaviorPositions,
//   // StateMachineWebserver,
// } from "@nxg-org/mineflayer-static-statemachine";
// import { EnvState } from "src/core/environment/state";
// import { StateBehavior } from "@nxg-org/mineflayer-static-statemachine";
// import { EventEmitter } from "events";
// import TypedEmitter from "typed-emitter";
// import { Direction, Vicinity } from "src/core/environment/surroundings";
// import { SkillReturn } from "src/types";

// // Import behaviors we need
// import {
//   BehaviorWildcard as Wildcard,
//   BehaviorIdle as Idle,
//   BehaviorExit as Exit,
// } from "@nxg-org/mineflayer-static-statemachine/lib/behaviors";

// const Start = Exit.clone("Start");

// import { StateMachineData } from "@nxg-org/mineflayer-static-statemachine/lib/stateBehavior";

// // Event types for surroundings checker
// type SurroundingsEvents = {
//   thingFound: (
//     thingName: string,
//     vicinity: Vicinity | Direction,
//     envState: EnvState
//   ) => void;
//   threatDetected: () => void;
// };

// // Class to handle surroundings checking independent of states
// class SurroundingsChecker extends (EventEmitter as new () => TypedEmitter<SurroundingsEvents>) {
//   private bot: Bot;
//   private stopBlocksIdsToNames: Map<number, string> = new Map();
//   private stopBiomeIdsToNames: Map<number, string> = new Map();
//   private lastScanTime: number = 0;
//   private scanThrottleSeconds: number;

//   constructor(bot: Bot, scanThrottleSeconds: number = 3) {
//     super();
//     this.bot = bot;
//     this.scanThrottleSeconds = scanThrottleSeconds;
//   }

//   setThingsToFind(stopIfFound: string[]): void {
//     this.stopBlocksIdsToNames.clear();
//     this.stopBiomeIdsToNames.clear();

//     for (const thingName of stopIfFound) {
//       if (this.bot.registry.blocksByName[thingName]) {
//         const blockId = this.bot.registry.blocksByName[thingName].id;
//         this.stopBlocksIdsToNames.set(blockId, thingName);
//       } else if (this.bot.registry.biomesByName[thingName]) {
//         const biomeId = this.bot.registry.biomesByName[thingName].id;
//         this.stopBiomeIdsToNames.set(biomeId, thingName);
//       } else {
//         console.warn(
//           `WARNING: Couldn't recognize '${thingName}'. Make sure you are only passing valid blocks, or biomes!`
//         );
//       }
//     }
//   }

//   attachListeners = (): void => {
//     this.bot.on("move", this.checkSurroundings);
//   };

//   detachListeners = (): void => {
//     this.bot.off("move", this.checkSurroundings);
//   };

//   checkSurroundings = (): void => {
//     const currentTime = Date.now() / 1000;
//     if (currentTime - this.lastScanTime < this.scanThrottleSeconds) return;

//     this.lastScanTime = currentTime;

//     // Hydrate surroundings
//     this.bot.envState.surroundings.hydrate(this.scanThrottleSeconds);

//     // Check for blocks in immediate surroundings
//     for (const [blockId, blockName] of this.stopBlocksIdsToNames) {
//       if (
//         immediate.blocks?.get(blockName) !== null &&
//         immediate.blocks?.get(blockName) !== undefined
//       ) {
//         this.emit(
//           "thingFound",
//           blockName,
//           Vicinity.IMMEDIATE_SURROUNDINGS,
//           this.bot.envState
//         );
//         return;
//       }

//       // Check in distant surroundings by direction
//       for (const direction of Object.values(Direction)) {
//         if (
//           distant?.get(direction)?.blocksToCounts?.get(blockName) !== null &&
//           distant?.get(direction)?.blocksToCounts?.get(blockName) !== undefined
//         ) {
//           this.emit("thingFound", blockName, direction, this.bot.envState);
//           return;
//         }
//       }
//     }

//     // Check for biomes in immediate surroundings
//     for (const [biomeId, biomeName] of this.stopBiomeIdsToNames) {
//       if (immediate.biomes?.has(biomeId)) {
//         this.emit(
//           "thingFound",
//           biomeName,
//           Vicinity.IMMEDIATE,
//           this.bot.envState
//         );
//         return;
//       }

//       // Check in distant surroundings by direction
//       for (const direction of Object.values(Direction)) {
//         if (
//           distant?.get(direction)?.biomesToClosestCoords?.get(biomeId) !==
//             null &&
//           distant?.get(direction)?.biomesToClosestCoords?.get(biomeId) !==
//             undefined
//         ) {
//           this.emit("thingFound", biomeName, direction, this.bot.envState);
//           return;
//         }
//       }
//     }

//     // TODO: Check for threats if needed
//     // if (threatDetected) {
//     //   this.emit('threatDetected');
//     // }
//   };
// }

// // State for actual pathfinding

// // Note: this has too many "things" going on in it. ("handleThingFound", etc.)
// // I kept it here because I'm rushing, but realistically this would be handled externally,
// // away from this class. This is an encapsulation of the pathfinding behavior.
// class BehaviorPathfindToCoords extends StateBehavior {
//   static stateName = "PathfindToCoords";
//   private movements: Movements;
//   private goal?: goals.Goal;

//   constructor(bot: Bot, data: StateMachineData) {
//     super(bot, data);
//     this.movements = new Movements(bot);
//   }

//   onStateEntered(): void {
//     if (!this.bot.pathfinder) throw Error("Pathfinder is not loaded!");
//     if (!this.data.targetGoal) throw Error("No target goal defined!");

//     // Setup listeners for checking surroundings and path status
//     this.bot.on("path_update", this.handlePathUpdate);
//     this.bot.on("goal_reached", this.handleGoalReached);
//     this.data.surroundingsChecker.attachListeners();
//     this.data.surroundingsChecker.on("thingFound", this.handleThingFound);

//     // Start pathfinding
//     this.startMoving(this.data.targetGoal);
//   }

//   update(): void {
//     // Nothing needed in update as event handlers handle everything
//   }

//   onStateExited(): void {
//     this.data.surroundingsChecker.detachListeners();
//     this.bot.off("path_update", this.handlePathUpdate);
//     this.data.surroundingsChecker.off("thingFound", this.handleThingFound);
//     this.bot.pathfinder.stop();
//   }

//   isFinished(): boolean {
//     return (
//       Boolean(this.data.thingFound) ||
//       this.data.pathComplete ||
//       this.data.pathFailed
//     );
//   }

//   thingWasFound(): boolean {
//     return Boolean(this.data.thingFound);
//   }

//   pathWasSuccessful(): boolean {
//     return this.data.pathComplete;
//   }

//   pathFailed(): boolean {
//     return this.data.pathFailed;
//   }

//   handlePathUpdate = (path: any): void => {
//     if (path.status === "noPath") {
//       this.data.result = `No feasible path to ${this.data.targetGoal} found. Are the coordinates reachable?`;
//       this.data.pathFailed = true;
//     }

//     if (path.status === "timeout") {
//       this.data.result = `Pathfinding timeout, couldn't find a path to ${this.data.targetGoal} in time.`;
//       this.data.pathFailed = true;
//     }
//   };

//   handleGoalReached = (goal: goals.Goal): void => {
//     if (goal === this.goal) {
//       this.data.result = `Pathfinding completed successfully!`;
//       this.data.pathComplete = true;
//     } else {
//       this.data.result = `Pathfinding was terminated! Somehow this event fired on a different goal. Goal: ${this.goal}`;
//     }
//   };

//   handleThingFound = (
//     thingName: string,
//     vicinity: Vicinity | Direction,
//     envState: EnvState
//   ): void => {
//     this.data.thingFound = { name: thingName, vicinity: vicinity };

//     if (vicinity === Vicinity.IMMEDIATE) {
//       this.data.result = `Pathfinding terminated early: '${thingName}' found in the ${vicinity} surroundings!`;
//     } else {
//       this.data.result = `Pathfinding terminated early: '${thingName}' found in (at least) the ${vicinity} direction!`;
//     }
//   };

//   private async startMoving(goal: goals.Goal): Promise<void> {
//     this.goal = goal; // new goals.GoalNear(pos.x, pos.y, pos.z, 2);
//     this.bot.pathfinder.setMovements(this.movements);
//     this.bot.pathfinder.setGoal(this.goal);
//   }
// }

// // State for handling interrupt
// class BehaviorThingInterrupt extends StateBehavior {
//   static stateName = "ThingSeen";

//   constructor(bot: Bot, data: StateMachineData) {
//     super(bot, data);
//   }

//   onStateEntered(): void {
//     if (this.data.thingFound) {
//       const { name, vicinity } = this.data.thingFound;
//       this.bot.chat(`Found ${name} in the ${vicinity} vicinity!`);
//     }
//   }

//   isFinished(): boolean {
//     return true; // Just a notification state, always finishes right away
//   }
// }

// // State for handling successful pathfinding
// class BehaviorPathComplete extends StateBehavior {
//   static stateName = "PathComplete";

//   constructor(bot: Bot, data: StateMachineData) {
//     super(bot, data);
//   }

//   onStateEntered(): void {
//     this.bot.chat(`Reached coordinates ${this.data.targetGoal}`);
//   }

//   isFinished(): boolean {
//     return true; // Just a notification state, always finishes right away
//   }
// }

// // State for handling pathfinding failure
// class BehaviorPathFailed extends StateBehavior {
//   static stateName = "PathFailed";

//   constructor(bot: Bot, data: StateMachineData) {
//     super(bot, data);
//   }

//   onStateEntered(): void {
//     this.bot.chat(`Pathfinding failed: ${this.data.result}`);
//   }

//   isFinished(): boolean {
//     return true; // Just a notification state, always finishes right away
//   }
// }

// export async function pathfindToCoordinates(
//   bot: Bot,
//   wantedGoal: goals.Goal,
//   stopIfFound: string[] = []
// ): Promise<SkillReturn> {
//   // Create shared data object
//   const surroundChecker = new SurroundingsChecker(bot);
//   const data: StateMachineData = {
//     result: null,
//     targetGoal: wantedGoal,
//     stopIfFound: stopIfFound,
//     thingFound: null,
//     pathComplete: false,
//     pathFailed: false,
//     surroundingsChecker: surroundChecker,
//   };

//   surroundChecker.setThingsToFind(stopIfFound);

//   // Define pathfinder state machine transitions
//   const pathfinderTransitions = [
//     // If we're interrupted by an object
//     getTransition(
//       "pathfindToThingInterrupt",
//       BehaviorPathfindToCoords,
//       BehaviorThingInterrupt
//     )
//       .setShouldTransition(
//         (state) => state.isFinished() && state.thingWasFound()
//       )
//       .build(),

//     // If we reach the destination successfully
//     getTransition(
//       "pathfindToComplete",
//       BehaviorPathfindToCoords,
//       BehaviorPathComplete
//     )
//       .setShouldTransition(
//         (state) => state.isFinished() && state.pathWasSuccessful()
//       )
//       .build(),

//     // If pathfinding fails
//     getTransition(
//       "pathfindToFailed",
//       BehaviorPathfindToCoords,
//       BehaviorPathFailed
//     )
//       .setShouldTransition((state) => state.isFinished() && state.pathFailed())
//       .build(),
//   ];

//   // Build the nested machine
//   const pathfinderMachine = getNestedMachine(
//     "pathfinder",
//     pathfinderTransitions,
//     BehaviorPathfindToCoords,
//     [BehaviorPathFailed, BehaviorPathComplete, BehaviorThingInterrupt]
//   ).build();

//   // starts root machine immediately upon creation.
//   const root = new BotStateMachine({
//     bot,
//     root: pathfinderMachine,
//     data,
//     autoStart: true,
//   });

//   // await resolution of this state machine.
//   await new Promise<void>((resolve) => {
//     root.on("stateEntered", (mType, machine, state) => {
//       if (
//         state === BehaviorPathFailed ||
//         state === BehaviorPathComplete ||
//         state === BehaviorThingInterrupt
//       ) {
//         resolve();
//       }
//     });
//   });

//   return {
//     resultString: data.result,
//     envStateIsHydrated: data.thingFound !== null, // If stopIfFound thing was found, we're exiting at the same instant as the surroundings check
//   };
// }

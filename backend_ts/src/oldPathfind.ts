import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import type { Bot, BotEvents } from "mineflayer";
import { Vec3 } from "vec3";
import type { Entity } from "prismarine-entity";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter"
import type {Block as PBlock} from "prismarine-block"
import { ImmediateSurroundings, Direction, Vicinity, EnvState} from "./envState";


type PathfinderAbstractionEvents = {
    thingFound: (thingName: string, vicinity: Vicinity | Direction, envState: EnvState) => void;
    threatDetected: () => void;
}

type StopIfFoundThings = {
    blocks: Map<number, string>;
    biomes: Map<number, string>;
}


export class PathfinderAbstraction extends (EventEmitter as new () => TypedEmitter<PathfinderAbstractionEvents>) {
  public constructor(private readonly bot: Bot) {
    super();
  }

  private setupListeners(goal: goals.Goal, stopIfFoundThings: StopIfFoundThings) {
    const moveListener = (lastMove: Vec3) => {
        // TODO: Check if there are one or more hostile mobs in a _threatening_ range
        // If so, emit associated event
        // this.emit('threatDetected')

        // Get surroundings, making sure to pass a throttleSeconds argumend to prevent spamming calls
        const [immediate, distant] = this.bot.envState.surroundings.getSurroundings(3);
        
        // Emit 'thingFound' if any blocks have been found in the surroundings
        for (const [blockId, blockName] of stopIfFoundThings.blocks) {
            if (immediate.blocks!.get(blockName) !== null) {
                this.emit('thingFound', blockName, Vicinity.IMMEDIATE, this.bot.envState);
                return;
            }
            for (const direction of Object.values(Direction)) {
                if (distant!.get(direction)!.blocksToCounts!.get(blockName) !== null) {
                    this.emit('thingFound', blockName, direction, this.bot.envState);
                    return;
                }
            }
        }

        // Emit 'thingFound' if any biomes have been found in the surroundings
        for (const [biomeId, biomeName] of stopIfFoundThings.biomes) {
            if (immediate.biomes!.has(biomeId)) {
                this.emit('thingFound', biomeName, Vicinity.IMMEDIATE, this.bot.envState);
                return;
            }
            for (const direction of Object.values(Direction)) {
                if (distant!.get(direction)!.biomesToClosestCoords!.get(biomeId) !== null) {
                    this.emit('thingFound', biomeName, direction, this.bot.envState);
                    return;
                }
            }
        }
    }

    const updateListener = (path: PartiallyComputedPath) => {
        if (path.status === 'noPath') {
            cleanup();
        }
        if (path.status === "timeout") {
            cleanup();
        }
    }
  
    const cleanup = () => {
        this.bot.off("goal_reached", cleanup);
        this.bot.off("path_stop", cleanup);
        this.bot.off("move", moveListener);
        this.bot.off('path_update', updateListener);

        if (goal === this.bot.pathfinder.goal) {
            this.bot.pathfinder.stop()
        }
    };
  
    this.bot.on('move', moveListener); // Handle intermittent movement
    this.bot.on('goal_reached', cleanup); // Handle completion
    this.bot.on('path_stop', cleanup); // Handle cancelling/interrupt
    this.bot.on('path_update', updateListener); // Handle pathfinding updates
  }
  
  public async pathfindToCoordinates(coordinates: number[], stopIfFound: string[]): Promise<[EnvState | null, string | null]> {
    let resultsString = "";
    
    // Parse coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 3 || coordinates.some(isNaN)) {
        return [null, "Invalid coordinates array. Expected an array of three numbers."];
    }
    const coords = new Vec3(coordinates[0], coordinates[1], coordinates[2]);

    // Parse stopIfFound array
    let stopBlockIdsToNames:  Map<number, string> = new Map();
    let stopBiomeIdsToNames: Map<number, string> = new Map();
    if (Array.isArray(stopIfFound)) {
        for (const thingName of stopIfFound) {
            if (this.bot.registry.blocksByName[thingName]) {
                const blockId = this.bot.registry.blocksByName[thingName].id;
                stopBlockIdsToNames.set(blockId, thingName);
            }
            else if (this.bot.registry.biomesByName[thingName]) {
                const biomeId = this.bot.registry.biomesByName[thingName].id;
                stopBiomeIdsToNames.set(biomeId, thingName);
            }
            else {
                resultsString += `WARNING: Couldn't recognize '${thingName}'. Make sure you are only passing valid blocks, or biomes!\n`;
            }
        }
    }
    const stopIfFoundThings = {blocks: stopBlockIdsToNames, biomes: stopBiomeIdsToNames};
    
    // Set pathfinder goal
    let goal: goals.GoalBlock 
    try {
        goal = new goals.GoalBlock(coords.x, coords.y, coords.z);
        this.bot.pathfinder.setGoal(goal);
    }
    catch (error) {
        resultsString += `Error setting pathfinder goal: ${error}\n`;
        return [null, resultsString];
    }

    // Set up listeners
    this.setupListeners(goal, stopIfFoundThings);
    
    // Set up handler for reacting to ongoing threats 
    this.on('threatDetected', () => {
        // Stop the pathfinding
        if (goal === this.bot.pathfinder.goal) {
            this.bot.pathfinder.stop()
        }
        // TODO: Call the function that will handle the threat

        // Reinitiate pathfinding after threats are handled
        goal = new goals.GoalBlock(coords.x, coords.y, coords.z);
        this.bot.pathfinder.setGoal(goal);
    });

    // Await exit condition
    const [envState, resultsStringToAppend] = await new Promise<[EnvState | null, string]>((resolve) => {
        this.on('thingFound', (thingName, vicinity, envState) => {
            if (vicinity === Vicinity.IMMEDIATE) {
                resolve([envState, `Pathfinding terminated early: '${thingName}' found in the immediate surroundings!`]);
            }
            resolve([envState, `Pathfinding terminated early: '${thingName}' found in the distant surroundings!`]);
        });
    
        this.bot.on('goal_reached', () => {
            resolve([null, `Pathfinding to ${coords} completed. No \`stopIfFound\` conditions were met.`]);
        });

        this.bot.on('path_update', (path) => {
            if (path.status === 'noPath') resolve([null, `No feasible path to ${coords} found. Are the coordinates reachable?`]);
            if (path.status === "timeout") resolve([null, `Pathfinding timeout, couldn\'t find a path to ${coords} in time.`]);
        })
        
        this.bot.on('path_stop', () => {
            resolve([null, `Pathfinding terminated early without successfully reaching ${coords}.`]);  // TODO: Add reason?
        });
    });
    resultsString += resultsStringToAppend;

    return [envState, resultsString];
  }
}

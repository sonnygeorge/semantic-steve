import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import type { Bot, BotEvents } from "mineflayer";
import { Vec3 } from "vec3";
import type { Entity } from "prismarine-entity";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter"
import type {Block as PBlock} from "prismarine-block"
import { Direction } from "../constants";


type PathfinderAbstractionEvents = {
    thingFound: (thingName: string) => void;
    threatDetected: () => void;
}

type StopIfFoundThings = {
    blocks: Map<number, string>;
    entities: Map<number, string>;
    biomes: Map<number, string>;
}


export class PathfinderAbstraction extends (EventEmitter as new () => TypedEmitter<PathfinderAbstractionEvents>) {
  public constructor(private readonly bot: Bot) {
    super();
  }

  private setupListeners(goal: goals.Goal, stopIfFoundThings: StopIfFoundThings) {
    const moveListener = (lastMove: Vec3) => {
        // TODO: Get surroundings - make sure to use throttle to avoid spamming!

        // TODO: Check if there are one or more hostile mobs in a _threatening_ range
        // If so, emit associated event
        // this.emit('threatDetected')

        // TODO: Check if any stopIfFound things are in surroundings
        // If so, emit associated event
        // const foundThingName: string = "temp";
        // this.emit('thingFound', foundThingName)
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
  
  public async pathfindToCoordinates(coordinates: number[], stopIfFound: string[]) {
    let resultsString = "";
    
    // Parse coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 3 || coordinates.some(isNaN)) {
        return "Invalid coordinates array. Expected an array of three numbers.";
    }
    const coords = new Vec3(coordinates[0], coordinates[1], coordinates[2]);

    // Parse stopIfFound array
    let stopBlockIdsToNames:  Map<number, string> = new Map();
    let stopEntityIdsToNames: Map<number, string> = new Map();
    let stopBiomeIdsToNames: Map<number, string> = new Map();
    for (const thingName of stopIfFound) {
        if (this.bot.registry.blocksByName[thingName]) {
            const blockId = this.bot.registry.blocksByName[thingName].id;
            stopBlockIdsToNames.set(blockId, thingName);
        }
        else if (this.bot.registry.entitiesByName[thingName]) {
            const entityId = this.bot.registry.entitiesByName[thingName].id;
            stopEntityIdsToNames.set(entityId, thingName);
        }
        else if (this.bot.registry.biomesByName[thingName]) {
            const biomeId = this.bot.registry.biomesByName[thingName].id;
            stopBiomeIdsToNames.set(biomeId, thingName);
        }
        else {
            resultsString += `WARNING: Couldn't recognize '${thingName}'. Make sure you are only passing valid blocks, entities, or biomes!\n`;
        }
    }
    const stopIfFoundThings = {blocks: stopBlockIdsToNames, entities: stopEntityIdsToNames, biomes: stopBiomeIdsToNames};
    
    // Set pathfinder goal
    let goal: goals.GoalBlock 
    try {
        goal = new goals.GoalBlock(coords.x, coords.y, coords.z);
        this.bot.pathfinder.setGoal(goal);
    }
    catch (error) {
        resultsString += `Error setting pathfinder goal: ${error}\n`;
        return resultsString;
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
    resultsString += await new Promise<string>((resolve) => {
        this.on('thingFound', (thingName) => {
            resolve(`Pathfinding terminated early: '${thingName}' found in the surroundings!`);
        });
    
        this.bot.on('goal_reached', () => {
            resolve(`Pathfinding to ${coords} completed. No \`stopIfFound\` conditions were met.`);
        });

        this.bot.on('path_update', (path) => {
            if (path.status === 'noPath') resolve(`No feasible path to ${coords} found. Are the coordinates reachable?`);
            if (path.status === "timeout") resolve(`Pathfinding timeout, couldn\'t find a path to ${coords} in time.`);
        })
        
        this.bot.on('path_stop', () => {
            resolve(`Pathfinding terminated early without successfully reaching ${coords}.`);  // TODO: Add reason?
        });
    });

    return resultsString;
  }
}

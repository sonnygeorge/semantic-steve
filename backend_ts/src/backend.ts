import * as zmq from 'zeromq';
import { createPlugin } from ".";
import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";
import readline from "readline";
import { PathfinderStopConditions } from "./movement/types";
import { ImmediateSurroundings, NearbySurroundings, SemanticWorld } from "./world/worldState";

// Create the bot
const bot = createBot({
    username: "SemanticSteve",
});

bot.once("spawn", async () => {
    const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 80 });
    bot.loadPlugin(semanticSteve);
    console.log("Bot spawned and ready!");
    await startBackend();
});


// Define interfaces for message structures
interface FrontendMessage {
    function: string;
    args: any[];
    kwargs: Record<string, any>;
}

interface BackendMessage {
    env_state: string;
    result: any;
}

// Where we register functions that can be called by the frontend
const functionRegistry: Record<string, (...args: any[]) => any> = {  // TODO: move to a functionRegistry.ts file
    tempExample: async () => {
        console.log("Note: `tempExample` doesn't actually do anything.");
        return [bot.semanticWorld.toString(), "This is a dummy test result example to show how these outputs should look."];
      },
    pathfindToCoordinate: async (coords: number[], stopIfFound: string[]) => {  // TODO: This function often never exits because the 'goal_reached' event is never emitted (can't get to the goal coords)
        // TODO: Actually parse the stopIfFound array to create cancelOpts
        const entitiesToCancel = [bot.registry.entitiesByName["zombie"].id];
        const blocksToCancel = [bot.registry.blocksByName["iron_ore"].id];
        const biomesToCancel = [bot.registry.biomesByName["minecraft:jungle"].id];
        const cancelOpts: PathfinderStopConditions = {
          entities: {
            ids: entitiesToCancel,
            radius: 10,
          },
          blocks: {
            types: blocksToCancel,
            radius: 10,
          },
          biomes: {
            types: biomesToCancel,
            radius: 32,
          },
        };
        const vec3Coords = new Vec3(coords[0], coords[1], coords[2])
        const res = await bot.pathfinderAbstract.pathfindToCoordinate(vec3Coords, cancelOpts);
      },
    // TODO: Add other functions...
};


async function startBackend() {
    console.log("Starting backend...");

    // NOTE: You can see what processes are listening on port 5555 with `lsof -i :5555`
    // TODO: Error out if the port is already being used/listened by an existing (likely dangling) process
    // TODO: Do I need to do anything to clean up the socket when the process exits?
    const socket = new zmq.Pair();
    await socket.bind('tcp://*:5555');
    console.log('Backend connected on tcp://*:5555');
    
    // Get initial environment state
    let envState = bot.semanticWorld.toString();
        
    // Send initial message to frontend
    const initialMessage: BackendMessage = {
        env_state: envState,
        result: null  // Since no functions have been invoked
    };
    await socket.send(JSON.stringify(initialMessage));

    // Main loop to handle incoming messages
    for await (const [msg] of socket) {
        // Process the function call
        const message: FrontendMessage = JSON.parse(msg.toString());
        console.log("Received message from frontend");
        let result: any;  // TODO: Type?
        if (functionRegistry[message.function]) {
            console.log("Function found in registry");
            try {
                [envState, result] = await functionRegistry[message.function](
                    ...message.args,
                    // message.kwargs - TODO: You can't "unpack kwargs" in JS, so idk how to support mappings as "kwargs"
                );
                console.log("Function executed successfully");
            } catch (funcError: unknown) {
                if (funcError instanceof Error) {
                    // Log instead of error because the log is getting forwarded to the console in real time whereas console.error is being handled by Python explicitly and not written the console in real time
                    console.log("Function execution error:", funcError.message);
                    console.log(funcError.stack);
                    result = `Function execution error: ${funcError.message}`;
                    // Update the environment state even if there's an error - TODO: Do we want to do this this way?
                    envState = bot.semanticWorld.toString();
                }
                else {
                    result = "Function execution error: Unknown error type";  // FIXME: Idk how to properly handle errors in typescript
                }
            }
        } else {
            result = `Error: Function '${message.function}' not found`;
        }

        // Send response back to frontend
        const response: BackendMessage = {
            env_state: envState,
            result: result
        };
        await socket.send(JSON.stringify(response));
    }
}

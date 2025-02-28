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

bot.once("spawn", () => {
    const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
    bot.loadPlugin(semanticSteve);
    console.log("Bot spawned and ready!");
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
const functionRegistry: Record<string, (...args: any[]) => any> = {
    pathfindToCoordinate: async (coords: number[], stopIfFound: string[]) => {
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
      
        const res = await bot.pathfinderAbstract.pathfindToCoordinate(new Vec3(coords[0], coords[1], coords[2]), cancelOpts);
        console.log("RETURNED VALUE:", res);
      }
    // ...
};


async function startBackend() {
    const socket = new zmq.Pair();
    await socket.bind('tcp://*:5555');
    console.log('Backend started on tcp://*:5555');
    
    // Get initial environment state
    let updatedEnvState = bot.semanticWorld.toString();
        
    // Send initial message to frontend
    const initialMessage: BackendMessage = {
        env_state: updatedEnvState,
        result: null  // Since no functions have been invoked
    };
    await socket.send(JSON.stringify(initialMessage));

    // Main loop to handle incoming messages
    for await (const [msg] of socket) {
        // Process the function call
        const message: FrontendMessage = JSON.parse(msg.toString());
        let result: any;
        if (functionRegistry[message.function]) {
            try {
                [updatedEnvState, result] = await functionRegistry[message.function](
                    ...message.args,
                    message.kwargs
                );
            } catch (funcError) {
                result = `Function execution error: {funcError.message}`;  // FIXME
            }
            // } catch (funcError) {
            //     result = `Function execution error: ${funcError.message}`;
            // }
        } else {
            result = `Error: Function '${message.function}' not found`;
        }

        // Send response back to frontend
        const response: BackendMessage = {
            env_state: updatedEnvState,
            result: result
        };
        await socket.send(JSON.stringify(response));
    }
}

// Start the backend
startBackend()
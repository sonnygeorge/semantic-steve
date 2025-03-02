import * as zmq from 'zeromq';
import { createPlugin } from "./";
import { createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { PathfinderStopConditions } from "./movement/types";

// Initialize bot
const bot = createBot({ username: "SemanticSteve" });

bot.once("spawn", async () => {
    bot.loadPlugin(createPlugin({ immediateRadius: 5, nearbyRadius: 80 }));
    console.log("Bot spawned and ready!");
    await startBackend();
});

interface FrontendMessage { function: string; args: any[]; kwargs: Record<string, any>; }
interface BackendMessage { env_state: string; result: any; }

const functionRegistry: Record<string, (...args: any[]) => Promise<string>> = {
    tempExample: async () => "This is a dummy test result example to show how these outputs should look.",
    
    pathfindToCoordinate: async (coords: number[], stopIfFound: string[]) => {
        const cancelOpts: PathfinderStopConditions = {
            entities: { ids: [bot.registry.entitiesByName["zombie"].id], radius: 10 },
            blocks: { types: [bot.registry.blocksByName["iron_ore"].id], radius: 10 },
            biomes: { types: [bot.registry.biomesByName["minecraft:jungle"].id], radius: 32 },
        };
        return bot.pathfinderAbstract.pathfindToCoordinate(new Vec3(coords[0], coords[1], coords[2]), cancelOpts);
    }
};

async function startBackend() {
    console.log("Starting backend...");
    const socket = new zmq.Pair();
    await socket.bind('tcp://*:5555');
    console.log('Backend connected on tcp://*:5555');
    await socket.send(JSON.stringify({ env_state: bot.semanticWorld.toString(), result: null }));

    for await (const [msg] of socket) {
        const message: FrontendMessage = JSON.parse(msg.toString());
        console.log("Received message from frontend");
        
        let result: any = `Error: Function '${message.function}' not found`;
        if (message.function in functionRegistry) {
            try {
                result = await functionRegistry[message.function](...message.args);
            } catch (error) {
                result = `Function execution error: ${(error instanceof Error) ? error.message : 'Unknown error'}`;
            }
        }
        
        await socket.send(JSON.stringify({ env_state: bot.semanticWorld.toString(), result }));
    }
}
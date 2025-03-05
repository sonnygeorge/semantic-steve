import * as zmq from 'zeromq';
import { createPlugin } from "./";
import { createBot } from "mineflayer";
import {mineflayer as mfViewer} from 'prismarine-viewer'
import { EnvState } from "./envState";



// Initialize bot
const bot = createBot({ username: "SemanticSteve" });

bot.once("spawn", async () => {
    bot.loadPlugin(createPlugin({ immediateSurroundingsRadius: 5, distantSurroundingsRadius: 64 }));


    console.log("Bot spawned and ready!");
    mfViewer(bot, {port: 3000, firstPerson: true})

    await startBackend();
});


interface FrontendMessage { function: string; args: any[]; kwargs: Record<string, any>; }
interface BackendMessage { env_state: string; result: any; }

type SemanticSteveFunction = (...args: any[]) => Promise<[EnvState | null, string | null]>;


const functionRegistry: Record<string, SemanticSteveFunction> = {    
    testWorld: async () => {
        bot.envState.surroundings.getSurroundings();
        return [bot.envState, 'worked?']
    },

    pathfindToCoordinates: async (coords: number[], stopIfFound: string[]) => {
        return bot.pathfinderAbstract.pathfindToCoordinates(coords, stopIfFound);
    }
};


async function startBackend() {
    console.log("Starting backend...");
    const socket = new zmq.Pair();
    await socket.bind('tcp://*:5555');
    console.log('Backend connected on tcp://*:5555');
    
    console.log("Getting initial environment state...");
    // TODO: (fixme) Not working this first time around because this.bot.world.getColumns() comes back empty
    bot.envState.surroundings.getSurroundings();

    await socket.send(JSON.stringify({ env_state: bot.envState.getReadableString(), result: null }));

    for await (const [msg] of socket) {
        const message: FrontendMessage = JSON.parse(msg.toString());
        console.log("Received message from frontend");
        
        let envState: EnvState | null = null;
        let resultString: string | null = `Error: Function '${message.function}' not found`;

        if (message.function in functionRegistry) {
            let envState: EnvState | null = null;
            try {
                [envState, resultString] = await functionRegistry[message.function](...message.args);
            } catch (error) {
                resultString = `Function execution error: ${(error instanceof Error) ? `${error.message}:\n${error.stack?.split('\n').map((line: string) => line.trim()).join('\n')}` : 'Unknown error'}`;
                envState = null;
            }
        }

        // NOTE: The purpose of requiring an EnvState return value is essentially as a means of
        // "flagging" whether or not the bot.EnvState has already been updated by the function call
        // or if we need to update it manually here.
        if (envState === null) {
            // Update the environment stat to be up-to-date if the function didn't already take care of that
            bot.envState.surroundings.getSurroundings();
            envState = bot.envState;
        }

        await socket.send(JSON.stringify({ env_state: envState.getReadableString(), result: resultString }));
    }
}
import * as zmq from "zeromq";
import { createBot } from "mineflayer";
import { mineflayer as mfViewer } from "prismarine-viewer";
import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { buildSkillsRegistry } from "./skills-registry";
import { SurroundingsOptions, SkillReturnObj } from "./types";
import { EnvState } from "./env-state";
import { SurroundingsHelper } from "./string-parsers";

declare module "mineflayer" {
  interface Bot {
    envState: EnvState;
    surroundingsHelper: SurroundingsHelper;
  }
}

function createPlugin(opts: SurroundingsOptions) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.envState = new EnvState(bot, opts);
    bot.surroundingsHelper = new SurroundingsHelper(bot);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

// Initialize bot
const bot = createBot({ username: "SemanticSteve" });

bot.once("spawn", async () => {
  bot.loadPlugin(
    createPlugin({
      immediateSurroundingsRadius: 3,
      distantSurroundingsRadius: 24,
    }),
  );

  console.log("Bot spawned!");
  await bot.waitForChunksToLoad();
  console.log("Chunks loaded!");

  mfViewer(bot, { port: 3000, firstPerson: true });

  await startBackend();
});

const skillsRegistry = buildSkillsRegistry(bot);

interface FrontendMessage {
  function: string;
  args: any[];
  kwargs: Record<string, any>;
}

async function startBackend() {
  console.log("Starting backend...");
  const socket = new zmq.Pair();
  await socket.bind("tcp://*:5555");
  console.log("Backend connected on tcp://*:5555");

  console.log("Getting initial environment state...");
  // TODO: (fixme) Not working this first time around because this.bot.world.getColumns() comes back empty
  bot.envState.surroundings.getSurroundings();

  await socket.send(
    JSON.stringify({
      env_state: bot.envState.getString(),
      env_state_str: bot.envState.getReadableString(),
      result: null,
    }),
  );

  for await (const [msg] of socket) {
    const message: FrontendMessage = JSON.parse(msg.toString());
    console.log("Received message from frontend");

    let ssFnReturnObj = {
      resultString: `Error: Function '${message.function}' not found`,
      envStateIsUpToDate: true,
    } as SkillReturnObj;

    if (message.function in skillsRegistry) {
      let envState: EnvState | null = null;
      try {
        ssFnReturnObj = await skillsRegistry[message.function](
          bot,
          ...message.args,
        );
      } catch (error) {
        ssFnReturnObj.resultString = `Function execution error: ${
          error instanceof Error
            ? `${error.message}:\n${error.stack
                ?.split("\n")
                .map((line: string) => line.trim())
                .join("\n")}`
            : "Unknown error"
        }`;
      }
    }

    // Update the environment state to be up-to-date if needed (e.g., the function didn't already take care of that)
    if (!ssFnReturnObj.envStateIsUpToDate) {
      bot.envState.surroundings.getSurroundings();
    }

    await socket.send(
      JSON.stringify({
        env_state: bot.envState.getString(),
        env_state_str: bot.envState.getReadableString(),
        result: ssFnReturnObj.resultString,
      }),
    );
  }
}

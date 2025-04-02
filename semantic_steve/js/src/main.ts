import * as zmq from "zeromq";
import { createBot } from "mineflayer";
import { mineflayer as mfViewer } from "prismarine-viewer";
import { createPlugin } from "./";
import { buildSkillsRegistry } from "./skills-registry";
import { SkillReturn, SkillInvocation } from "./types";
import { EnvState } from "./core/environment/state";

const bot = createBot({ username: "SemanticSteve" });

bot.once("spawn", async () => {
  bot.loadPlugin(
    createPlugin({
      immediateSurroundingsRadius: 3,
      distantSurroundingsRadius: 24,
    })
  );
  console.log("Bot spawned!");
  await bot.waitForChunksToLoad();
  console.log("Chunks loaded!");
  mfViewer(bot, { port: 3000, firstPerson: true }); // TODO: Move port to constants or config?
  await startBackend();
});

const skillsRegistry = buildSkillsRegistry(bot);

async function startBackend() {
  console.log("Hello from JS process!");
  const socket = new zmq.Pair();
  await socket.bind("tcp://*:5555"); // TODO: Move port to a shard config.json?
  console.log("Backend connected on tcp://*:5555");

  console.log("Getting initial environment state...");
  // TODO: (fixme) Not working this first time around because this.bot.world.getColumns() comes back empty
  bot.envState.surroundings.getSurroundings();

  await socket.send(
    JSON.stringify({
      env_state: bot.envState.getString(),
      env_state_str: bot.envState.getReadableString(),
      result: null,
    })
  );

  for await (const [msg] of socket) {
    const skillInvocation: SkillInvocation = JSON.parse(msg.toString());
    console.log("Received message from frontend");

    let skillReturnObj = {
      resultString: `Error: Function '${skillInvocation.skillName}' not found`,
      envStateIsUpToDate: true,
    } as SkillReturn;

    if (skillInvocation.skillName in skillsRegistry) {
      let envState: EnvState | null = null;
      try {
        skillReturnObj = await skillsRegistry[skillInvocation.skillName](
          skillInvocation.kwargs
        );
      } catch (error) {
        skillReturnObj.resultString = `Function execution error: ${
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
    if (!skillReturnObj.envStateIsUpToDate) {
      bot.envState.surroundings.getSurroundings();
    }

    await socket.send(
      JSON.stringify({
        env_state: bot.envState.getString(),
        env_state_str: bot.envState.getReadableString(),
        result: skillReturnObj.resultString,
      })
    );
  }
}

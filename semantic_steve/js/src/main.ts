import * as zmq from "zeromq";
import { createBot } from "mineflayer";
import { mineflayer as mfViewer } from "prismarine-viewer";
import { createPlugin } from "./";
import { buildSkillsRegistry } from "./skills-registry";
import { SkillReturn } from "./types";
import { SkillInvocation, DataFromMinecraft } from "./py-messages";
import { EnvState } from "./core/environment/state";
import { genericResultsMessages } from "./results-messages";

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
  mfViewer(bot, { port: 3000, firstPerson: true }); // TODO: Move port to constants or config?
  await main();
});

const skillsRegistry = buildSkillsRegistry(bot);

async function main() {
  console.log("Hello from JS process!");
  const socket = new zmq.Pair();
  await socket.bind("tcp://*:5555"); // TODO: Move port to a shared config.json?
  console.log("Backend connected on tcp://*:5555");

  bot.envState.surroundings.hydrate();

  let toSend: DataFromMinecraft = {
    envState: bot.envState.getDTO(),
    skillInvocationResults: null,
  };

  await socket.send(JSON.stringify(toSend));

  for await (const [msg] of socket) {
    const skillInvocation: SkillInvocation = JSON.parse(msg.toString());

    let skillReturn: SkillReturn = {
      resultString: null,
      envStateIsHydrated: false,
    };

    if (!(skillInvocation.skillName in skillsRegistry)) {
      skillReturn.resultString =
        genericResultsMessages.ERROR_SKILL_NAME_NOT_FOUND(
          skillInvocation.skillName,
        );
    } else {
      try {
        skillReturn = await skillsRegistry[skillInvocation.skillName](
          ...skillInvocation.args,
        );
      } catch (error) {
        skillReturn.resultString =
          genericResultsMessages.UNHANDLED_RUNTIME_ERROR(
            skillInvocation.skillName,
            error instanceof Error
              ? `${error.message}:\n${error.stack
                  ?.split("\n")
                  .map((line: string) => line.trim())
                  .join("\n")}`
              : "Unknown error",
          );
      }
    }

    if (!skillReturn.envStateIsHydrated) {
      bot.envState.surroundings.hydrate();
    }

    toSend = {
      envState: bot.envState.getDTO(),
      skillInvocationResults: skillReturn.resultString,
    };

    await socket.send(JSON.stringify(toSend));
  }
}

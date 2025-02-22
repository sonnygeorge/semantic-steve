import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { PathfinderStopConditions } from "../src/movement/types";
import { Direction } from "../src/constants";
import readline from "readline";
import { handleCommand } from "./common";

const bot = createBot({
  username: "test",
});

bot.once("spawn", () => {
  const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
  bot.loadPlugin(semanticSteve);
  console.log("Bot spawned and ready for interactive CLI commands.");
  startCLI();
});

async function pathfindToCoordinate(coords: Vec3) {
  const entitiesToCancel = [bot.registry.entitiesByName["zombie"].id];
  const blocksToCancel = [bot.registry.blocksByName["iron_ore"].id];
  const biomesToCancel = [bot.registry.biomesByName["minecraft:jungle"].id];

  const cancelOpts = {
    entities: { ids: entitiesToCancel, radius: 10 },
    blocks: { types: blocksToCancel, radius: 10 },
    biomes: { types: biomesToCancel, radius: 32 },
  };

  const res = await bot.pathfinderAbstract.pathfindToCoordinate(coords, cancelOpts);
  console.log("RETURNED VALUE:", res);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function clearConsole() {
  process.stdout.write("\u001b[2J\u001b[0;0H");
}

function generatePrompt(bot: Bot) {
  return `Semantic Steve 1.0.0!
  World State:
  ${bot.semanticWorld.toString()}

  [${bot.username}] > `;
}


function startCLI() {
  rl.setPrompt(generatePrompt(bot));
  rl.prompt();

  rl.on("line", async (line) => {
    await handleCommand(bot, line);
    rl.setPrompt(generatePrompt(bot));
    rl.prompt();
  });
}

bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`Chat message from ${username}: ${message}`);
  handleCommand(bot, message);
});

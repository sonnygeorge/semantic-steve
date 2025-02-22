import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { PathfinderStopConditions } from "../src/movement/types";
import { Direction } from "../src/constants";
import readline from "readline";

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

async function handleCommand(line: string) {
  const [cmd, ...args] = line.trim().split(" ");

  switch (cmd) {
    case "goto":
      if (args.length < 3) return console.log("Invalid coordinates");
      const [x, y, z] = args.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) return console.log("Invalid coordinates");
      await pathfindToCoordinate(new Vec3(x, y, z));
      break;

    case "come":
      const { x: cx, y: cy, z: cz } = bot.entity.position;
      await pathfindToCoordinate(new Vec3(cx, cy, cz));
      break;

    case "dirBlock":
      if (args.length < 1) return console.log("Invalid block name");
      const mdBlock = bot.registry.blocksByName[args[0]];
      if (!mdBlock) return console.log("Invalid block name");
      const faceDir = bot.semanticWorld.getFacingDirection();
      const blocks = bot.semanticWorld.findBlocks(faceDir, { matching: mdBlock.id });
      console.log(blocks);
      break;

    case "biomes":
      const biomes = bot.semanticWorld.nearbySurroundings.biomes(Direction.ALL);
      for (const [num, pt] of biomes.entries()) {
        const biome = bot.registry.biomes[num];
        console.log(num, pt, biome.displayName);
      }
      break;

    case "info":
      const immEntities = bot.semanticWorld.immediateSurroundings.entities;
      const faceDirInfo = bot.semanticWorld.getFacingDirection();
      const nearbyEntities = bot.semanticWorld.nearbySurroundings.players(faceDirInfo);
      console.log("Immediate Entities:", immEntities);
      console.log("Nearby Entities:", nearbyEntities);
      break;

    case "exit":
      console.log("Exiting CLI...");
      rl.close();
      process.exit(0);
      break;

    default:
      console.log("Unknown command");
  }
}

function startCLI() {
  rl.setPrompt(generatePrompt(bot));
  rl.prompt();

  rl.on("line", async (line) => {
    await handleCommand(line);
    rl.setPrompt(generatePrompt(bot));
    rl.prompt();
  });
}

bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`Chat message from ${username}: ${message}`);
  handleCommand(message);
});

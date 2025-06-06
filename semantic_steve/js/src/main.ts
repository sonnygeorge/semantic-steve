/**
 * Main entrypoint script invoked as a subprocess by the Python wrapper with
 * `node build/main.js`.
 */

import { createBot } from "mineflayer";
import { createPlugin } from ".";
import { mineflayer as mfViewer } from "prismarine-viewer";

import { SemanticSteve } from "./semantic-steve";
import { SemanticSteveConfig, SemanticSteveConfigOptions } from "./types";
import { isValidEmail } from "./utils/generic";

// Create a config by loading environment variables or using defaults.
const config = new SemanticSteveConfig({
  botHost: process.env.BOT_HOST || "localhost",
  botPort: parseInt(process.env.BOT_PORT || "25565"),
  mfViewerPort: parseInt(process.env.MF_VIEWER_PORT || "3000"),
  zmqPort: parseInt(process.env.ZMQ_PORT || "5555"),
  immediateSurroundingsRadius: parseInt(
    process.env.IMMEDIATE_SURROUNDINGS_RADIUS || "5"
  ),
  distantSurroundingsRadius: parseInt(
    process.env.DISTANT_SURROUNDINGS_RADIUS || "32"
  ),
  username: process.env.MC_USERNAME || "SemanticSteve",
} as SemanticSteveConfigOptions);

// Create a Mineflayer bot instance
const bot = createBot({
  port: config.botPort,
  host: config.botHost,
  username: config.username,
  auth: isValidEmail(config.username) ? "microsoft" : "offline",
});

// Create our "plugin" on the bot instance
bot.once("login", () => {
  bot.loadPlugin(
    createPlugin({
      immediateSurroundingsRadius: config.immediateSurroundingsRadius,
      distantSurroundingsRadius: config.distantSurroundingsRadius,
    })
  );
});

// Initialize and run SemanticSteve once the bot has spawned and chunks have loaded
bot.once("spawn", async () => {
  await bot.waitForChunksToLoad();
  mfViewer(bot, { port: config.mfViewerPort, firstPerson: true });
  const semanticSteve = new SemanticSteve(bot, config);
  semanticSteve.run();
});

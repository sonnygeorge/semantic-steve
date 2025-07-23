/**
 * Main entrypoint script invoked as a subprocess by the Python wrapper with
 * `node build/main.js`.
 */

import { createBot } from "mineflayer";
import { Movements } from "mineflayer-pathfinder";
import { createPlugin } from ".";
import { mineflayer as mfViewer } from "prismarine-viewer";

import { SemanticSteve } from "./semantic-steve";
import { SemanticSteveConfig, SemanticSteveConfigOptions } from "./types";
import { isValidEmail } from "./utils/generic";
import { MAX_ALLOWED_PATHFINDING_TIME_MS } from "./constants";

console.log("Starting SemanticSteve javascript process...");

// Create a config by loading environment variables or using defaults.
const config = new SemanticSteveConfig({
  botHost: process.env.SEMANTIC_STEVE_BOT_HOST || "localhost",
  botPort: parseInt(process.env.SEMANTIC_STEVE_BOT_PORT || "25565"),
  mfViewerPort: parseInt(process.env.SEMANTIC_STEVE_MF_VIEWER_PORT || "3000"),
  zmqPort: parseInt(process.env.SEMANTIC_STEVE_ZMQ_PORT || "5555"),
  immediateSurroundingsRadius: parseInt(
    process.env.SEMANTIC_STEVE_IMMEDIATE_SURROUNDINGS_RADIUS || "4",
  ),
  distantSurroundingsRadius: parseInt(
    process.env.SEMANTIC_STEVE_DISTANT_SURROUNDINGS_RADIUS || "27",
  ),
  username: process.env.SEMANTIC_STEVE_MC_USERNAME || "SemanticSteve",
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
    }),
  );
});

// Initialize and run SemanticSteve once the bot has spawned and chunks have loaded
bot.once("spawn", async () => {
  const movements = new Movements(bot);
  movements.allow1by1towers = false; // Do not build 1x1 towers when going up
  movements.placeCost = 2.5; // W/ default of 1.0, bot always tries to bridge places (wasting blocks)
  movements.digCost = 1.5;
  bot.pathfinder.setMovements(movements);
  // Set the max time used by pathfinder for thinking to a low value to allow more frequent
  // interleaving between pathfinding and visibility raycasting.
  bot.pathfinder.tickTimeout = 10; // 10 milliseconds
  // This is a weird parameter; it essentially the max amount before the AStar computer
  // shuts off and doesn't allow any more new branching paths to be computed. Therefore,
  // We set it to the same value that we allow for a single pathfinding run--so it doesn't
  // shut off (triggering a 'timeout' status which we handle by resolving the skill) and
  // end our pathfinding preumaturely to this decided amount of allowed pathfinding time.
  bot.pathfinder.thinkTimeout = MAX_ALLOWED_PATHFINDING_TIME_MS + 500; // 500ms buffer to avoid race conditions
  // Since we set the thinkTimeout so high, we should conversely limit the search radius
  // to keep from taking up the entire time to think about a path beyond a reasonable radius
  // (allowing the AStar computer to return a 'noPath' status without infinite search).
  (bot.pathfinder as any).searchRadius = 70; // searchRadius not in index.d.ts, cast to any

  await bot.envState.surroundings.beginObservation();

  mfViewer(bot, { port: config.mfViewerPort, firstPerson: true });

  const semanticSteve = new SemanticSteve(bot, config);
  semanticSteve.run();
});

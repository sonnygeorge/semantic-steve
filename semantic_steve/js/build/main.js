"use strict";
/**
 * Main entrypoint script invoked as a subprocess by the Python wrapper with
 * `node build/main.js`.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mineflayer_1 = require("mineflayer");
const _1 = require(".");
const prismarine_viewer_1 = require("prismarine-viewer");
const semantic_steve_1 = require("./semantic-steve");
const types_1 = require("./types");
const generic_1 = require("./utils/generic");
const constants_1 = require("./constants");
console.log("Starting SemanticSteve javascript process...");
// Create a config by loading environment variables or using defaults.
const config = new types_1.SemanticSteveConfig({
    botHost: process.env.SEMANTIC_STEVE_BOT_HOST || "localhost",
    botPort: parseInt(process.env.SEMANTIC_STEVE_BOT_PORT || "25565"),
    mfViewerPort: parseInt(process.env.SEMANTIC_STEVE_MF_VIEWER_PORT || "3000"),
    zmqPort: parseInt(process.env.SEMANTIC_STEVE_ZMQ_PORT || "5555"),
    immediateSurroundingsRadius: parseInt(process.env.SEMANTIC_STEVE_IMMEDIATE_SURROUNDINGS_RADIUS || "4"),
    distantSurroundingsRadius: parseInt(process.env.SEMANTIC_STEVE_DISTANT_SURROUNDINGS_RADIUS || "27"),
    username: process.env.SEMANTIC_STEVE_MC_USERNAME || "SemanticSteve",
});
// Create a Mineflayer bot instance
const bot = (0, mineflayer_1.createBot)({
    port: config.botPort,
    host: config.botHost,
    username: config.username,
    auth: (0, generic_1.isValidEmail)(config.username) ? "microsoft" : "offline",
});
// Create our "plugin" on the bot instance
bot.once("login", () => {
    bot.loadPlugin((0, _1.createPlugin)({
        immediateSurroundingsRadius: config.immediateSurroundingsRadius,
        distantSurroundingsRadius: config.distantSurroundingsRadius,
    }));
});
// Initialize and run SemanticSteve once the bot has spawned and chunks have loaded
bot.once("spawn", () => __awaiter(void 0, void 0, void 0, function* () {
    // Set the max time used by pathfinder for thinking to a low value to allow more frequent
    // interleaving between pathfinding and visibility raycasting.
    bot.pathfinder.tickTimeout = 10; // 10 milliseconds
    // This is a weird parameter; it essentially the max amount before the AStar computer
    // shuts off and doesn't allow any more new branching paths to be computed. Therefore,
    // We set it to the same value that we allow for a single pathfinding run--so it doesn't
    // shut off (triggering a 'timeout' status which we handle by resolving the skill) and
    // end our pathfinding preumaturely to this decided amount of allowed pathfinding time.
    bot.pathfinder.thinkTimeout = constants_1.MAX_ALLOWED_PATHFINDING_TIME_MS + 500; // 500ms buffer to avoid race conditions
    // Since we set the thinkTimeout so high, we should conversely limit the search radius
    // to keep from taking up the entire time to think about a path beyond a reasonable radius
    // (allowing the AStar computer to return a 'noPath' status without infinite search).
    bot.pathfinder.searchRadius = 70; // searchRadius not in index.d.ts, cast to any
    yield bot.envState.surroundings.beginObservation();
    (0, prismarine_viewer_1.mineflayer)(bot, { port: config.mfViewerPort, firstPerson: true });
    const semanticSteve = new semantic_steve_1.SemanticSteve(bot, config);
    semanticSteve.run();
}));

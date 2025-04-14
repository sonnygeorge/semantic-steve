"use strict";
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
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
const config = new semantic_steve_1.SemanticSteveConfig({
    botHost: process.env.BOT_HOST || "localhost",
    botPort: parseInt(process.env.BOT_PORT || "25565"),
    mfViewerPort: parseInt(process.env.MF_VIEWER_PORT || "3000"),
    zmqPort: parseInt(process.env.ZMQ_PORT || "5555"),
    immediateSurroundingsRadius: parseInt(process.env.IMMEDIATE_SURROUNDINGS_RADIUS || "5"),
    distantSurroundingsRadius: parseInt(process.env.DISTANT_SURROUNDINGS_RADIUS || "13"),
    username: process.env.MC_USERNAME || "SemanticSteve",
});
const bot = (0, mineflayer_1.createBot)({
    port: config.botPort,
    host: config.botHost,
    username: config.username,
    auth: isValidEmail(config.username) ? "microsoft" : "offline",
});
bot.once("spawn", () => __awaiter(void 0, void 0, void 0, function* () {
    bot.loadPlugin((0, _1.createPlugin)({
        immediateSurroundingsRadius: config.immediateSurroundingsRadius,
        distantSurroundingsRadius: config.distantSurroundingsRadius,
    }));
    yield bot.waitForChunksToLoad();
    (0, prismarine_viewer_1.mineflayer)(bot, { port: config.mfViewerPort, firstPerson: true });
    const semanticSteve = new semantic_steve_1.SemanticSteve(bot, config);
    semanticSteve.run();
}));

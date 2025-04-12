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
const config = new semantic_steve_1.SemanticSteveConfig();
const bot = (0, mineflayer_1.createBot)({ username: "SemanticSteve", port: config.botPort });
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

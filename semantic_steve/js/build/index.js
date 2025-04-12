"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
const mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
const env_state_1 = require("./env-state/env-state");
const thing_1 = require("./thing");
/**
 * "Creates a plugin" for the bot w/ the environment state and thing factory.
 */
function createPlugin(surroundingsRadii) {
    return (bot, botOptions) => {
        bot.envState = new env_state_1.EnvState(bot, surroundingsRadii);
        bot.thingFactory = new thing_1.ThingFactory(bot);
        if (!bot.hasPlugin(mineflayer_pathfinder_1.pathfinder))
            bot.loadPlugin(mineflayer_pathfinder_1.pathfinder);
    };
}

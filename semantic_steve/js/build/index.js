"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
const mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
const env_state_1 = require("./env-state/env-state");
const thing_type_1 = require("./thing-type");
/**
 * Creates our "plugin" for the bot w/ the environment state and thing factory.
 */
function createPlugin(surroundingsRadii) {
    return (bot, botOptions) => {
        // Monkey patch our custom objects as properties on the bot instance
        bot.envState = new env_state_1.EnvState(bot, surroundingsRadii);
        bot.thingTypeFactory = new thing_type_1.ThingTypeFactory(bot);
        // Ensure Prismarine's 'mineflayer-pathfinder' plugin is loaded
        if (!bot.hasPlugin(mineflayer_pathfinder_1.pathfinder))
            bot.loadPlugin(mineflayer_pathfinder_1.pathfinder);
        // Configure 'mineflayer-pathfinder' to our desired settings
        const customMovements = new mineflayer_pathfinder_1.Movements(bot);
        customMovements.digCost = 0.8; // Make additional cost for digging cheaper (than default 1.0)
        customMovements.placeCost = 1.2; // Make additional cost for placing more expensive (than default 1.0)
        bot.pathfinder.setMovements(customMovements);
    };
}

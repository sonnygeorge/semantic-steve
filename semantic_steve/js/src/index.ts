import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { EnvState } from "./env-state/env-state";
import { ThingTypeFactory as ThingTypeFactory } from "./thing-type";
import { SurroundingsRadii } from "./env-state/surroundings";

declare module "mineflayer" {
  interface Bot {
    envState: EnvState;
    thingTypeFactory: ThingTypeFactory;
  }
}

/**
 * Creates our "plugin" for the bot w/ the environment state and thing factory.
 */
export function createPlugin(surroundingsRadii: SurroundingsRadii) {
  return (bot: Bot, botOptions: BotOptions) => {
    // Monkey patch our custom objects as properties on the bot instance
    bot.envState = new EnvState(bot, surroundingsRadii);
    bot.thingTypeFactory = new ThingTypeFactory(bot);
    // Ensure Prismarine's 'mineflayer-pathfinder' plugin is loaded
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

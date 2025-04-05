import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { EnvState } from "./env-state/env-state";
import { ThingFactory } from "./thing";
import { SurroundingsRadii } from "./env-state/surroundings";

declare module "mineflayer" {
  interface Bot {
    envState: EnvState;
    thingFactory: ThingFactory;
  }
}

/**
 * "Creates a plugin" for the bot w/ the environment state and thing factory.
 */
export function createPlugin(surroundingsRadii: SurroundingsRadii) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.envState = new EnvState(bot, surroundingsRadii);
    bot.thingFactory = new ThingFactory(bot);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

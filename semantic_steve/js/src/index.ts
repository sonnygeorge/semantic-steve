import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { EnvState } from "./core/environment/state";
import { ThingFactory } from "./core/thing";
import { SurroundingsRadii } from "./core/environment/surroundings";

declare module "mineflayer" {
  interface Bot {
    envState: EnvState;
    thingFactory: ThingFactory;
  }
}

export function createPlugin(surroundingsRadii: SurroundingsRadii) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.envState = new EnvState(bot, surroundingsRadii);
    bot.thingFactory = new ThingFactory(bot);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

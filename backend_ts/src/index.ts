import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { EnvState } from "./envState";
import { SurroundingsOptions } from "./types";
import { SurroundingsHelper } from "./stringParsers";
import { buildFunctionRegistry } from "./modules";

declare module "mineflayer" {
  interface Bot {
    envState: EnvState;
    surroundingsHelper: SurroundingsHelper;
  }
}





export function createPlugin(opts: SurroundingsOptions) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.envState = new EnvState(bot, opts);
    bot.surroundingsHelper = new SurroundingsHelper(bot);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

export { buildFunctionRegistry } from "./modules";

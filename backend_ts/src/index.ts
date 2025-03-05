import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { PathfinderAbstraction } from "./pathfinding"
import { EnvState } from "./envState";
import { SurroundingsOptions } from "./types";

declare module "mineflayer" {
  interface Bot {
    pathfinderAbstract: PathfinderAbstraction;
    envState: EnvState;
  }
}





export function createPlugin(opts: SurroundingsOptions) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.pathfinderAbstract = new PathfinderAbstraction(bot);
    bot.envState = new EnvState(bot, opts);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

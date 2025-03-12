import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { PathfinderAbstraction } from "./oldPathfind"  // TODO: I think this is junk we can remove now
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
    bot.pathfinderAbstract = new PathfinderAbstraction(bot);  // TODO: I think this is junk we can remove now
    bot.envState = new EnvState(bot, opts);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

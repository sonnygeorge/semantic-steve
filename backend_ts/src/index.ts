import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { PathfinderAbstraction } from "./movement/movement";
import { PathfinderAbstractionOptions } from "./movement/types";
import { ImmediateSurroundings, NearbySurroundings } from "./world/worldState";
import { SemanticOptions } from "./types";

declare module "mineflayer" {
  interface Bot {
    pathfinderAbstract: PathfinderAbstraction;
    immediateSurroundings: ImmediateSurroundings;
    nearbySurroundings: NearbySurroundings;
  }
}





export function createPlugin(opts: SemanticOptions) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.pathfinderAbstract = new PathfinderAbstraction(bot);
    bot.immediateSurroundings = new ImmediateSurroundings(bot, { radius: opts.immediateRadius }); // hard coded
    bot.nearbySurroundings = new NearbySurroundings(bot, { blockRadius: opts.nearbyRadius }); // hard coded

    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

import { pathfinder } from "mineflayer-pathfinder";
import type { Bot, BotOptions } from "mineflayer";
import { PathfinderAbstraction } from "./movement/movement";
import { PathfinderAbstractionOptions } from "./movement/types";
import { SemanticWorld } from "./world/worldState1";
import { SemanticOptions } from "./types";

declare module "mineflayer" {
  interface Bot {
    pathfinderAbstract: PathfinderAbstraction;
    semanticWorld: SemanticWorld;
  }
}





export function createPlugin(opts: SemanticOptions) {
  return (bot: Bot, botOptions: BotOptions) => {
    bot.pathfinderAbstract = new PathfinderAbstraction(bot);
    bot.semanticWorld = new SemanticWorld(bot, opts);
    if (!bot.hasPlugin(pathfinder)) bot.loadPlugin(pathfinder);
  };
}

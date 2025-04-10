import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Vec3 } from "vec3";
import { Direction, Vicinity } from "../env-state/surroundings";

export class Player implements Thing {
  bot: Bot;
  name: string;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
  }
  locateNearest(direction: Vicinity): Vec3 | Promise<Vec3 | null> | null {
    throw new Error("Method not implemented.");
  }


  public isVisibleInImmediateSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(
      this.name
    );
  }

  public isVisibleInDistantSurroundings(): boolean {
    return [...this.bot.envState.surroundings.distant.values()].some((dir) =>
      dir.blocksToCounts.has(this.name)
    );
  }

 
}

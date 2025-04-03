import { Bot } from "mineflayer";
import { Thing } from "./protocol";
import { DistantSurroundingsInADirection } from "../environment/surroundings/types";

export class Block implements Thing {
  bot: Bot;
  name: string;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
  }

  isVisibleInSurroundings(): boolean {
    if (
      this.bot.envState.surroundings.immediate.blocksToAllCoords.has(this.name)
    ) {
      return true;
    }
    this.bot.envState.surroundings.distant.forEach(
      (distantSurroundingsInADirection, direction) => {
        if (distantSurroundingsInADirection.blocksToCounts.has(this.name)) {
          return true;
        }
      }
    );
    return false;
  }
}

import { Bot } from "mineflayer";
import { Thing } from "./thing";

export class Block implements Thing {
  bot: Bot;
  name: string;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
  }

  public isVisibleInImmediateSurroundings(): boolean {
    if (
      this.bot.envState.surroundings.immediate.blocksToAllCoords.has(this.name)
    ) {
      return true;
    }
    return false;
  }

  public isVisibleInDistantSurroundings(): boolean {
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

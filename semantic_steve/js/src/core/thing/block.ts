import { Bot } from "mineflayer";
import { Thing } from "src/core/thing/protocol";

export class Block implements Thing {
  bot: Bot;
  name: string;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
  }

  isInSurroundings(): boolean {
    return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(
      this.name
    );
  }
}

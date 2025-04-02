import { Bot } from "mineflayer";
import { Thing } from "src/core/thing/protocol";

export class Biome implements Thing {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  isInSurroundings(): boolean {
    return false;  // TODO: Implement
  }
}

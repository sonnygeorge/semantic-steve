import { Bot } from "mineflayer";
import { Thing } from "src/core/thing/protocol";
import { Block } from "src/core/thing/block";
import { Biome } from "src/core/thing/biome";

export class ThingFactory {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public createThing(thingString: string): Thing {
    return new Block(this.bot); // TODO Implement
  }
}

import { Bot } from "mineflayer";
import { Thing } from "./protocol";
import { Block } from "./block";
import { Biome } from "./biome";

export const SUPPORTED_THING_TYPES: string = "['block', 'biome']";

export class ThingFactory {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public createThing(thing: string): Thing | null {
    // Block
    const blockNames = Object.values(this.bot.registry.blocksByName).map(
      (b) => b.name,
    );
    if (blockNames.includes(thing)) {
      return new Block(this.bot, thing);
    }

    // Biome
    const biomeNames = Object.values(this.bot.registry.biomes).map(
      (b) => b.name,
    );
    if (biomeNames.includes(thing)) {
      return new Biome(this.bot, thing);
    }

    return null; // Return null if thing is not recognized
  }
}

import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Block } from "./block";
import { Biome } from "./biome";

export const SUPPORTED_THING_TYPES: string = "['block', 'biome']";

export class InvalidThingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidThingTypeError";
  }
}

export class ThingFactory {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Creates a Thing object based on the provided input string.
   * @param thing The name of the thing to create (e.g., "wood_planks", "plains").
   * @returns {Thing} The created Thing object.
   * @throws {InvalidThingError} If the input string does not correspond to a valid (supported) thing.
   */
  public createThing(thing: string): Thing {
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

    throw new InvalidThingError(
      `Invalid thing type: ${thing}. Supported types are: ${SUPPORTED_THING_TYPES}`,
    );
  }
}

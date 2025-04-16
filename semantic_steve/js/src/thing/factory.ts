import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Block } from "./block";
import { Biome } from "./biome";
import { ItemEntity } from "./itemEntity";

export const SUPPORTED_THING_TYPES: string = "['block', 'biome', 'itemEntity']";

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

  public createBlock(thing: string): Block | null {
    const blockNames = Object.values(this.bot.registry.blocksByName).map(
      (b) => b.name
    );
    if (blockNames.includes(thing)) {
      return new Block(this.bot, thing);
    }
    return null;
  }

  public createBiome(thing: string): Biome | null {
    const biomeNames = Object.values(this.bot.registry.biomes).map(
      (b) => b.name
    );
    if (biomeNames.includes(thing)) {
      return new Biome(this.bot, thing);
    }
    return null;
  }

  public createItemEntity(thing: string): ItemEntity | null {
    const itemEntityNames = Object.values(
      this.bot.registry.itemsByName
    ).map((i) => i.name);
    if (itemEntityNames.includes(thing)) {
      return new ItemEntity(this.bot, thing);
    }
    return null;
  }


  /**
   * Creates a Thing object based on the provided input string.
   * @param thing The name of the thing to create (e.g., "wood_planks", "plains").
   * @returns {Thing} The created Thing object.
   * @throws {InvalidThingError} If the input string does not correspond to a valid (supported) thing.
   */
  public createThing(thing: string, preferred?: (new(...args: any[]) => Thing)): Thing {
    if (preferred != null) {
      switch (preferred.name) {
        case "Block":
          const block = this.createBlock(thing);
          if (block != null) {
            return block;
          }
          break;
        case "Biome":
          const biome = this.createBiome(thing);
          if (biome != null) {
            return biome;
          }
          break;
        case "ItemEntity":
          const itemEntity = this.createItemEntity(thing);
          if (itemEntity != null) {
            return itemEntity;
          }
          break;
      }
    }

    // now try all
    const block = this.createBlock(thing);
    if (block != null) {
      return block;
    }
    const biome = this.createBiome(thing);
    if (biome != null) {
      return biome;
    }
    const itemEntity = this.createItemEntity(thing);
    if (itemEntity != null) {
      return itemEntity;
    }

    throw new InvalidThingError(
      `Invalid thing type: ${thing}. Supported types are: ${SUPPORTED_THING_TYPES}`
    );
  }
}

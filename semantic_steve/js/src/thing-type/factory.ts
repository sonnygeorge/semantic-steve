import { Bot } from "mineflayer";
import { ThingType } from "./thing-type";
import { BlockType } from "./implementations/block-type";
import { BiomeType } from "./implementations/biome-type";
import { ItemType } from "./implementations/item-type";
import { InvalidThingError } from "../types";

export const SUPPORTED_THING_TYPES: string[] = ["block", "biome", "item"];

export class ThingTypeFactory {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public createThingType(name: string): ThingType {
    const attemptCreate = (
      Type: new (bot: Bot, name: string) => ThingType
    ): ThingType | null => {
      try {
        return new Type(this.bot, name);
      } catch (err) {
        if (!(err instanceof InvalidThingError)) throw err;
        return null;
      }
    };

    // Try each type in order of precedence
    const types = [BlockType, ItemType, BiomeType];
    for (const Type of types) {
      const result = attemptCreate(Type);
      if (result) return result;
    }

    // If we reach here, it means the name is not valid for any supported type
    throw new InvalidThingError(
      `Invalid thing name: ${name}. Supported types are: ${SUPPORTED_THING_TYPES}`
    );
  }
}

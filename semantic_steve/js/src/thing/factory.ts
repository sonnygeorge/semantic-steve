import { Bot } from "mineflayer";
import { Thing } from "./thing";
import { Block } from "./block";
import { Biome } from "./biome";
import { ItemEntity } from "./item-entity";
import { InvalidThingError } from "../types";

export const SUPPORTED_THING_TYPES: string[] = ["block", "biome", "itemEntity"];

export class ThingFactory {
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  public createThing(thingName: string): Thing {
    const attemptCreate = (
      Type: new (bot: Bot, name: string) => Thing,
    ): Thing | null => {
      try {
        return new Type(this.bot, thingName);
      } catch (err) {
        if (!(err instanceof InvalidThingError)) throw err;
        return null;
      }
    };

    // Try each type in order of precedence
    const types = [Block, ItemEntity, Biome];
    for (const Type of types) {
      const result = attemptCreate(Type);
      if (result) return result;
    }

    // If we reach here, it means the thingName is not valid for any supported type
    throw new InvalidThingError(
      `Invalid thing name: ${thingName}. Supported types are: ${SUPPORTED_THING_TYPES}`,
    );
  }
}

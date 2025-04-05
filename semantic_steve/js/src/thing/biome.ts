import assert from "assert";
import { Bot } from "mineflayer";
import { Thing } from "./thing";

export class Biome implements Thing {
  bot: Bot;
  name: string;
  id: number;

  constructor(bot: Bot, name: string) {
    this.bot = bot;
    this.name = name;
    this.id = -1;
    for (const [id, biome] of Object.entries(this.bot.registry.biomes)) {
      if (biome.name === this.name) {
        this.id = parseInt(id);
      }
    }
    assert(
      this.id !== -1,
      `This should be impossible if this object is being created by the factory`
    );
  }

  public isVisibleInImmediateSurroundings(): boolean {
    if (this.id in this.bot.envState.surroundings.immediate.biomes) {
      return true;
    }
    return false;
  }

  public isVisibleInDistantSurroundings(): boolean {
    this.bot.envState.surroundings.distant.forEach(
      (distantSurroundingsInADirection) => {
        if (
          distantSurroundingsInADirection.biomesToClosestCoords.has(this.id)
        ) {
          return true;
        }
      }
    );
    return false;
  }
}

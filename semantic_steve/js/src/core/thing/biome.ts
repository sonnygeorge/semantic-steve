import assert from "assert";
import { Bot } from "mineflayer";
import { Thing } from "src/core/thing/protocol";

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
      `This should be improssible if this is being created by the factory`
    );
  }

  isInSurroundings(): boolean {
    return this.id in this.bot.envState.surroundings.immediate.biomes;
  }
}

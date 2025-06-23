import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block as PBlock } from "prismarine-block";
import { ItemEntityWithData } from "../../types";

/**
 * Cache for item entities indexed by their UUIDs.
 */
export class ItemEntitiesCache extends Map<string, ItemEntityWithData> {
  private bot: Bot;

  constructor(bot: Bot) {
    super();
    this.bot = bot;
  }

  // NOTE: Could update this/add more methods to, e.g., query by entity type, name, etc.
}

/**
 * Cache for blocks indexed by stringified Vec3 positions.
 */
export class BlocksCache extends Map<string, PBlock> {
  private bot: Bot;

  constructor(bot: Bot) {
    super();
    this.bot = bot;
  }

  static getKeyFromVec3(pos: Vec3): string {
    return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
  }

  static getVec3FromKey(key: string): Vec3 {
    const parts = key.split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    return new Vec3(x, y, z);
  }

  // NOTE: Could update this/add more methods to, e.g., query by block type, height, etc.
}

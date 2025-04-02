import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { Item as PItem } from "prismarine-item";
import {
  Surroundings,
  SurroundingsRadii,
  SurroundingsDTO,
} from "src/core/environment/surroundings";

// TODO: Daytime/nightime?

enum EquipmentDestination {
  HAND = "hand",
  OFF_HAND = "off-hand",
  FEET = "feet",
  LEGS = "legs",
  TORSO = "torso",
  HEAD = "head",
}

const MINEFLAYER_EQUIPMENT_DESTINATION_ORDER = [
  "hand",
  "off-hand",
  "feet",
  "legs",
  "torso",
  "head",
];

/**
 * "Data Transfer Object" (DTO) version of `EnvState` containing the information that we
 * want to send to the Python client _as_ we want the user (LLM) to see it.
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type EnvStateDTO = {
  playerCoordinates: [number, number, number];
  health: string;
  hunger: string;
  inventory: Record<string, number>;
  equipped: Map<EquipmentDestination, string | null>;
  surroundings: SurroundingsDTO;
};

export class EnvState {
  private bot: Bot;
  public surroundings: Surroundings;

  constructor(bot: Bot, surroundingsRadii: SurroundingsRadii) {
    this.bot = bot;
    this.surroundings = new Surroundings(bot, surroundingsRadii);
  }

  public get botCoords(): Vec3 {
    return this.bot.entity.position;
  }

  public get health(): number {
    return this.bot.health;
  }

  public get hunger(): number {
    return this.bot.food;
  }

  public get inventory(): PItem[] {
    return this.bot.inventory.slots.filter(
      (item) => item !== null
    ) as unknown as PItem[];
  }

  public get equipped(): Map<EquipmentDestination, PItem | null> {
    const equipped = {} as any;
    for (let i = 0; i < MINEFLAYER_EQUIPMENT_DESTINATION_ORDER.length; i++) {
      equipped[MINEFLAYER_EQUIPMENT_DESTINATION_ORDER[i]] =
        this.bot.entity.equipment[i];
    }
    return equipped;
  }

  public hydrate(throttleSeconds?: number): void {
    this.surroundings.hydrate(throttleSeconds);
    // Potentially put other stuff in the future here (if more than just the surroundings
    // need 'hydration')...
  }

  public getDTO(): EnvStateDTO {
    return {
      playerCoordinates: [this.botCoords.x, this.botCoords.y, this.botCoords.z],
      health: `${this.health}/20`, // 20 is the max health in vanilla Minecraft
      hunger: `${this.hunger}/20`, // 20 is the max hunger in vanilla Minecraft
      inventory: Object.fromEntries(
        this.inventory.map((item) => [item.name, item.count])
      ) as Record<string, number>,
      equipped: Object.fromEntries(
        Object.entries(this.equipped).map(([key, item]) => [
          key,
          item?.name ?? null,
        ])
      ) as Map<EquipmentDestination, string | null>,
      surroundings: this.surroundings.getDTO(),
    };
  }
}

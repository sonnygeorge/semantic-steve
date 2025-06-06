import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { Item as PItem } from "prismarine-item";
import {
  Surroundings,
  SurroundingsRadii,
  SurroundingsDTO,
} from "./surroundings";
import { Inventory, InventoryItemDTO } from "./inventory";

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
 * want to send to the Python client in the format we want the user (LLM) to see it.
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type EnvStateDTO = {
  playerCoordinates: [number, number, number];
  health: string;
  hunger: string;
  inventory: InventoryItemDTO[];
  equipped: Map<EquipmentDestination, string | undefined>;
  surroundings: SurroundingsDTO;
};

export class EnvState {
  private bot: Bot;
  public surroundings: Surroundings;
  public inventory: Inventory;

  constructor(bot: Bot, surroundingsRadii: SurroundingsRadii) {
    this.bot = bot;
    this.surroundings = new Surroundings(bot, surroundingsRadii);
    this.inventory = new Inventory(bot);
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

  public get equipped(): Map<EquipmentDestination, PItem | undefined> {
    const equipped = {} as any;
    for (let i = 0; i < MINEFLAYER_EQUIPMENT_DESTINATION_ORDER.length; i++) {
      equipped[MINEFLAYER_EQUIPMENT_DESTINATION_ORDER[i]] =
        this.bot.entity.equipment[i];
    }
    return equipped;
  }

  public hydrate(throttleMS?: number): void {
    // For now, we just pass the throttleMS through to the surroundings
    // since there's nothing computationally expensive to retrieve here.
    this.surroundings.hydrate(throttleMS);
  }

  public getDTO(): EnvStateDTO {
    return {
      playerCoordinates: [
        // Round to 1 decimal place
        Math.round(this.botCoords.x * 10) / 10,
        Math.round(this.botCoords.y * 10) / 10,
        Math.round(this.botCoords.z * 10) / 10,
      ],
      health: `${this.health}/20`, // NOTE: 20 is the max health in vanilla Minecraft
      hunger: `${this.hunger}/20`, // NOTE: 20 is the max hunger in vanilla Minecraft
      inventory: this.inventory.getDTO(),
      equipped: Object.fromEntries(
        Object.entries(this.equipped).map(([key, item]) => [
          key,
          item?.name ?? null,
        ]),
      ) as Map<EquipmentDestination, string | undefined>,
      surroundings: this.surroundings.getDTO(),
    };
  }
}

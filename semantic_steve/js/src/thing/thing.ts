import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";
import { Vicinity } from "../env-state/surroundings";
export interface Thing {
  bot: Bot;
  name: string;

  isVisibleInImmediateSurroundings(): boolean;
  isVisibleInDistantSurroundings(): boolean;

  locateNearest(direction?: Vicinity): Promise<Vec3 | null> | Vec3 | null;
}

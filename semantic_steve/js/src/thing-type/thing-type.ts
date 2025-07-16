import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";
import { DirectionName } from "../types";

export interface ThingType {
  bot: Bot;
  name: string;

  isVisibleInImmediateSurroundings(): Promise<boolean>;

  isVisibleInDistantSurroundings(): Promise<boolean>;

  locateNearest(): Promise<Vec3 | undefined>;

  locateNearestInImmediateSurroundings(): Promise<Vec3 | undefined>;

  locateNearestInDistantSurroundings(
    direction?: DirectionName
  ): Promise<Vec3 | undefined>;

  isVisibleInImmediateSurroundingsAt(coords: Vec3): Promise<boolean>;
}

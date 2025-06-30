import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";
import { DirectionName } from "../env-state/surroundings";
import { MaybePromise } from "../types";

export interface ThingType {
  bot: Bot;
  name: string;

  isVisibleInImmediateSurroundings(): boolean;

  isVisibleInDistantSurroundings(): boolean;

  locateNearest(): MaybePromise<Vec3 | undefined>;

  locateNearestInImmediateSurroundings(): MaybePromise<Vec3 | undefined>;

  locateNearestInDistantSurroundings(
    direction?: DirectionName
  ): MaybePromise<Vec3 | undefined>;

  isVisibleInImmediateSurroundingsAt(coords: Vec3): boolean;
}

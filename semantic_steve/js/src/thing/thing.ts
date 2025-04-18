import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";
import { Direction } from "../env-state/surroundings";
import { MaybePromise } from "../types";

export interface Thing {
  bot: Bot;
  name: string;

  isVisibleInImmediateSurroundings(): boolean;
  isVisibleInDistantSurroundings(): boolean;

  locateNearest(): MaybePromise<Vec3 | undefined>;
  locateNearestInImmediateSurroundings(): MaybePromise<Vec3 | undefined>;
  locateNearestInDistantSurroundings(
    direction?: Direction,
  ): MaybePromise<Vec3 | undefined>;
}

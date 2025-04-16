import type { Bot } from "mineflayer";
import type { Vec3 } from "vec3";
import { Vicinity } from "../env-state/surroundings";
import { MaybePromise } from "../types";


export interface Thing {
  bot: Bot;
  name: string;

  isVisibleInImmediateSurroundings(): boolean;
  isVisibleInDistantSurroundings(): boolean;

  locateNearest(direction?: Vicinity): MaybePromise<Vec3>;

  locateNearest(): MaybePromise<Vec3>// E.g., calls this.locateNearestInImmediateSurroundings() first, then if undefined, tries this.locateNearestInDistantSurroundings()
  locateNearestInImmediateSurroundings(): MaybePromise<Vec3>
  locateNearestInDistantSurroundings(direction?: Vicinity): MaybePromise<Vec3>;
}

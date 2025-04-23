import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { _Surroundings, SurroundingsRadii, Vicinity } from "./types";
import { SurroundingsHydrater } from "./hydrater";

class HydratableSurroundings extends _Surroundings {
  private hydrater: SurroundingsHydrater;
  private timeOfLastHydration: Date;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    super(bot, radii);
    this.hydrater = new SurroundingsHydrater(bot, radii);
    this.timeOfLastHydration = new Date(0); // Jan 1 1970
  }

  public hydrate(throttleMS?: number): void {
    const now = new Date().getTime();
    const timeSinceLastHydrationMS = now - this.timeOfLastHydration.getTime();
    throttleMS = throttleMS ? throttleMS : 0;
    const shouldHydrate = timeSinceLastHydrationMS > throttleMS;

    if (shouldHydrate) {
      console.log("Hydrating surroundings...");
      const hydrated = this.hydrater.getHydration();
      Object.assign(this, hydrated);
      this.timeOfLastHydration = new Date();
    }
  }

  public getVicinityForPosition(pos: Vec3): Vicinity {
    return this.hydrater.getVicinityForPosition(pos);
  }
}

export { HydratableSurroundings as Surroundings };

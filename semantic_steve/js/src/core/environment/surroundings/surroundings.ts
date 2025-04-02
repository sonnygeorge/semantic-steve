import { Bot } from "mineflayer";
import {
  _Surroundings,
  SurroundingsRadii,
} from "src/core/environment/surroundings/types";
import { SurroundingsHydrater } from "src/core/environment/surroundings/hydrater";

class HydratableSurroundings extends _Surroundings {
  private hydrater: SurroundingsHydrater;
  private timeOfLastHydration: Date;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    super(bot, radii);
    this.hydrater = new SurroundingsHydrater(bot, radii);
    this.timeOfLastHydration = new Date(0); // Jan 1 1970
  }

  public hydrate(throttleSeconds?: number): void {
    const now = new Date().getTime();
    const timeSinceLastHydrationMS = now - this.timeOfLastHydration.getTime();
    const throttleMS = throttleSeconds ? throttleSeconds * 1000 : 0;
    const shouldHydrate = timeSinceLastHydrationMS > throttleMS;

    if (shouldHydrate) {
      const hydrated = this.hydrater.getHydration();
      Object.assign(this, hydrated);
      this.timeOfLastHydration = new Date();
    }
  }
}

export { HydratableSurroundings as Surroundings };

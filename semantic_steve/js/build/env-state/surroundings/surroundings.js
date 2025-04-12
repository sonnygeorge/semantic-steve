"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = void 0;
const types_1 = require("./types");
const hydrater_1 = require("./hydrater");
class HydratableSurroundings extends types_1._Surroundings {
    constructor(bot, radii) {
        super(bot, radii);
        this.hydrater = new hydrater_1.SurroundingsHydrater(bot, radii);
        this.timeOfLastHydration = new Date(0); // Jan 1 1970
    }
    hydrate(throttleMS) {
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
}
exports.Surroundings = HydratableSurroundings;

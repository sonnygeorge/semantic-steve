"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = void 0;
const common_1 = require("./common");
const vicinity_1 = require("./vicinity");
const get_vicinity_masks_1 = require("./get-vicinity-masks");
class Surroundings {
    constructor(bot, radii) {
        this.bot = bot;
        this.vicinitiesManager = new vicinity_1.VicinitiesManager(bot, radii);
        this.immediate = this.vicinitiesManager.immediate;
        this.distant = this.vicinitiesManager.distant;
        this.radii = this.vicinitiesManager.radii;
    }
    beginObservation() {
        this.vicinitiesManager.beginObservation();
    }
    *iterVicinities() {
        yield this.immediate;
        for (const direction of Object.values(common_1.DirectionName)) {
            yield this.distant.get(direction);
        }
    }
    getVicinityForPosition(position) {
        return (0, get_vicinity_masks_1.classifyVicinityOfPosition)(position, this.bot.entity.position, this.radii.immediateSurroundingsRadius, this.radii.distantSurroundingsRadius);
    }
    getDTO() {
        return {
            immediateSurroundings: this.immediate.getDTO(),
            distantSurroundings: Object.fromEntries([...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])),
        };
    }
}
exports.Surroundings = Surroundings;

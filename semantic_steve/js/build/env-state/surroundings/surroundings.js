"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = void 0;
const types_1 = require("../../types");
const vicinity_1 = require("./vicinity");
const classify_vicinity_1 = require("./classify-vicinity");
class Surroundings {
    constructor(bot, radii) {
        this.bot = bot;
        this.vicinitiesObserver = new vicinity_1.VicinitiesObserver(bot, radii);
        this.immediate = this.vicinitiesObserver.immediate;
        this.distant = this.vicinitiesObserver.distant;
        this.radii = this.vicinitiesObserver.radii;
    }
    beginObservation() {
        this.vicinitiesObserver.beginObservation();
    }
    *iterVicinities() {
        yield this.immediate;
        for (const direction of Object.values(types_1.DirectionName)) {
            yield this.distant.get(direction);
        }
    }
    getVicinityForPosition(position) {
        return (0, classify_vicinity_1.classifyVicinityOfPosition)(position, this.bot.entity.position, this.radii.immediateSurroundingsRadius, this.radii.distantSurroundingsRadius);
    }
    getDTO() {
        return {
            immediateSurroundings: this.immediate.getDTO(),
            distantSurroundings: Object.fromEntries([...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])),
        };
    }
}
exports.Surroundings = Surroundings;

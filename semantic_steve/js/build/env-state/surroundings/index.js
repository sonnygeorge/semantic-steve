"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = exports.Vicinity = exports.VicinitiesManager = exports.DistantSurroundingsInADirection = exports.ImmediateSurroundings = exports.VisibleVicinityContents = exports.VicinityName = exports.DirectionName = void 0;
const common_1 = require("./common");
Object.defineProperty(exports, "DirectionName", { enumerable: true, get: function () { return common_1.DirectionName; } });
Object.defineProperty(exports, "VicinityName", { enumerable: true, get: function () { return common_1.VicinityName; } });
const vicinity_1 = require("./vicinity");
Object.defineProperty(exports, "VisibleVicinityContents", { enumerable: true, get: function () { return vicinity_1.VisibleVicinityContents; } });
Object.defineProperty(exports, "ImmediateSurroundings", { enumerable: true, get: function () { return vicinity_1.ImmediateSurroundings; } });
Object.defineProperty(exports, "DistantSurroundingsInADirection", { enumerable: true, get: function () { return vicinity_1.DistantSurroundingsInADirection; } });
Object.defineProperty(exports, "VicinitiesManager", { enumerable: true, get: function () { return vicinity_1.VicinitiesManager; } });
Object.defineProperty(exports, "Vicinity", { enumerable: true, get: function () { return vicinity_1.Vicinity; } });
const get_vicinity_masks_1 = require("./get-vicinity-masks");
const vicinities_observer_1 = require("./visibility-manager/vicinities-observer");
class Surroundings {
    constructor(bot, radii) {
        this.bot = bot;
        this.vicinitiesObserver = new vicinities_observer_1.VicinitiesObserver(bot, radii);
        this.vicinitiesManager = new vicinity_1.VicinitiesManager(bot, radii);
        this.immediate = this.vicinitiesManager.immediate;
        this.distant = this.vicinitiesManager.distant;
        this.radii = this.vicinitiesManager.radii;
    }
    beginObservation() {
        this.vicinitiesObserver.beginObservation();
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
        return {};
    }
}
exports.Surroundings = Surroundings;

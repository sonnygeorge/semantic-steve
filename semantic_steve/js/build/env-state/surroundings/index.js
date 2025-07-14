"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = exports.Vicinity = exports.VicinitiesObserver = exports.DistantSurroundingsInADirection = exports.ImmediateSurroundings = exports.VisibleVicinityContents = void 0;
const vicinity_1 = require("./vicinity");
Object.defineProperty(exports, "VisibleVicinityContents", { enumerable: true, get: function () { return vicinity_1.VisibleVicinityContents; } });
Object.defineProperty(exports, "ImmediateSurroundings", { enumerable: true, get: function () { return vicinity_1.ImmediateSurroundings; } });
Object.defineProperty(exports, "DistantSurroundingsInADirection", { enumerable: true, get: function () { return vicinity_1.DistantSurroundingsInADirection; } });
Object.defineProperty(exports, "Vicinity", { enumerable: true, get: function () { return vicinity_1.Vicinity; } });
Object.defineProperty(exports, "VicinitiesObserver", { enumerable: true, get: function () { return vicinity_1.VicinitiesObserver; } });
const surroundings_1 = require("./surroundings");
Object.defineProperty(exports, "Surroundings", { enumerable: true, get: function () { return surroundings_1.Surroundings; } });
// TODO:
// - Update VicinitiesObserver to:
//   - Keep track of item itentities and mob entities
//   - For each vicinity, store distance-sorted, offset-based idxs for accessing the `OffsetBased3DArray`s
// - Write the Vicinity class to expose the expected API for querying the surroundings's vicinities
// - Write the ImmediateSurroundings and DistantSurroundingsInADirection classes to implement getDTO methods
// - Add MobType to thing-type implementations and test approaching mobs
// - Add KillMob skill

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VicinityName = exports.DirectionName = exports.VoxelFace = exports.BlockFace = exports.InvalidThingError = exports.SemanticSteveConfig = void 0;
class SemanticSteveConfig {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.selfPreservationCheckThrottleMS =
            (_a = options.selfPreservationCheckThrottleMS) !== null && _a !== void 0 ? _a : 1500;
        this.immediateSurroundingsRadius = (_b = options.immediateSurroundingsRadius) !== null && _b !== void 0 ? _b : 5;
        this.distantSurroundingsRadius = (_c = options.distantSurroundingsRadius) !== null && _c !== void 0 ? _c : 13;
        this.botHost = (_d = options.botHost) !== null && _d !== void 0 ? _d : "localhost";
        this.botPort = (_e = options.botPort) !== null && _e !== void 0 ? _e : 25565;
        this.mfViewerPort = (_f = options.mfViewerPort) !== null && _f !== void 0 ? _f : 3000;
        this.zmqPort = (_g = options.zmqPort) !== null && _g !== void 0 ? _g : 5555;
        this.username = (_h = options.username) !== null && _h !== void 0 ? _h : "SemanticSteve";
    }
}
exports.SemanticSteveConfig = SemanticSteveConfig;
class InvalidThingError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidThingTypeError";
    }
}
exports.InvalidThingError = InvalidThingError;
// BlockFace as used in prismarine-world... TODO: Can we not import this somehow?
exports.BlockFace = {
    UNKNOWN: -999,
    BOTTOM: 0,
    TOP: 1,
    NORTH: 2,
    SOUTH: 3,
    WEST: 4,
    EAST: 5,
};
// prismarine-world's Blockface, but as an enum
var VoxelFace;
(function (VoxelFace) {
    VoxelFace[VoxelFace["UNKNOWN"] = exports.BlockFace.UNKNOWN] = "UNKNOWN";
    VoxelFace[VoxelFace["BOTTOM"] = exports.BlockFace.BOTTOM] = "BOTTOM";
    VoxelFace[VoxelFace["TOP"] = exports.BlockFace.TOP] = "TOP";
    VoxelFace[VoxelFace["NORTH"] = exports.BlockFace.NORTH] = "NORTH";
    VoxelFace[VoxelFace["SOUTH"] = exports.BlockFace.SOUTH] = "SOUTH";
    VoxelFace[VoxelFace["WEST"] = exports.BlockFace.WEST] = "WEST";
    VoxelFace[VoxelFace["EAST"] = exports.BlockFace.EAST] = "EAST";
})(VoxelFace || (exports.VoxelFace = VoxelFace = {}));
/**
 * Keys identifying the 10 "directions" that slice the *distant* surroundings.
 *
 * A subset of the 11 "vicinities" in the bot's surroundings (which additionally includes
 * the immediate surroundings vicinity).
 */
var DirectionName;
(function (DirectionName) {
    DirectionName["UP"] = "up";
    DirectionName["DOWN"] = "down";
    DirectionName["NORTH"] = "north";
    DirectionName["NORTHEAST"] = "northeast";
    DirectionName["EAST"] = "east";
    DirectionName["SOUTHEAST"] = "southeast";
    DirectionName["SOUTH"] = "south";
    DirectionName["SOUTHWEST"] = "southwest";
    DirectionName["WEST"] = "west";
    DirectionName["NORTHWEST"] = "northwest";
})(DirectionName || (exports.DirectionName = DirectionName = {}));
/**
 * Keys used to identify the 11 regions of space around the bot.
 */
var VicinityName;
(function (VicinityName) {
    VicinityName["IMMEDIATE_SURROUNDINGS"] = "immediate";
    VicinityName["DISTANT_SURROUNDINGS_UP"] = "up";
    VicinityName["DISTANT_SURROUNDINGS_DOWN"] = "down";
    VicinityName["DISTANT_SURROUNDINGS_NORTH"] = "north";
    VicinityName["DISTANT_SURROUNDINGS_NORTHEAST"] = "northeast";
    VicinityName["DISTANT_SURROUNDINGS_EAST"] = "east";
    VicinityName["DISTANT_SURROUNDINGS_SOUTHEAST"] = "southeast";
    VicinityName["DISTANT_SURROUNDINGS_SOUTH"] = "south";
    VicinityName["DISTANT_SURROUNDINGS_SOUTHWEST"] = "southwest";
    VicinityName["DISTANT_SURROUNDINGS_WEST"] = "west";
    VicinityName["DISTANT_SURROUNDINGS_NORTHWEST"] = "northwest";
})(VicinityName || (exports.VicinityName = VicinityName = {}));

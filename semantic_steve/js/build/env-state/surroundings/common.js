"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VicinityName = exports.DirectionName = void 0;
// TODO: Change these to types?
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

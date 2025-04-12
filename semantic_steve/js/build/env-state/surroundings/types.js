"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._Surroundings = exports.DistantSurroundingsInADirection = exports.ImmediateSurroundings = exports.Vicinity = exports.Direction = void 0;
//=======
// Enums
//=======
/**
 * Keys used for the DistantSurroundings mapping—i.e., the 10 "directions" that we slice
 * the _distant surroundings_ into.
 */
var Direction;
(function (Direction) {
    Direction["UP"] = "up";
    Direction["DOWN"] = "down";
    Direction["NORTH"] = "north";
    Direction["NORTHEAST"] = "northeast";
    Direction["EAST"] = "east";
    Direction["SOUTHEAST"] = "southeast";
    Direction["SOUTH"] = "south";
    Direction["SOUTHWEST"] = "southwest";
    Direction["WEST"] = "west";
    Direction["NORTHWEST"] = "northwest";
})(Direction || (exports.Direction = Direction = {}));
/**
 * Keys used to identify the 11 regions of space around the bot.
 *
 * For the purpose of describing the bot's surroundings in language, we partition the 3D
 * space around the bot into 11 "vicinities" where:
 *
 * 1. `IMMEDIATE_SURROUNDINGS`:
 *    - Is the space within an immediate sphere of radius `ImmediateSurroundingsRadius`.
 *
 * 2. `DISTANT_SURROUNDINGS_UP` and `DISTANT_SURROUNDINGS_DOWN`:
 *    - Are cylindrical columns extending up and down from the circumference of the
 *     IMMEDIATE_SURROUNDINGS sphere, but not extending beyond `DistantSurroundingsRadius`.
 *
 * 3. `DISTANT_SURROUNDINGS_{NORTH, NORTHEAST, EAST, SOUTHEAST, SOUTH, SOUTHWEST, WEST, NORTHWEST}`:
 *    - Partition the remaining space in a sphere of radius `DistantSurroundingsRadius` into
 *      8 "wedges".
 *
 *      (Hint: picture an apple sliced by that one apple slicer kitchen tool that gets
 *      pressed down onto an apple and creates apple wedges while remove a center column
 *      containing the apple core.)
 *
 *
 * Horizontal slice (i.e. "viewed from above") at current bot y-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO    \       N       /    OOo
 *            oOO        \             /        OOo
 *          oOO           \           /           OOo
 *        oOO     NW       \         /     NE       OOo
 *       oOO.               \       /               .OOo
 *      oOO  '--.__         ooooooooo         __.--'  OOo
 *     oOO         ''__   oo         oo   __''         OOo
 *     oOO             'oo             oo'             OOo
 *     oOO   W          o   IMMEDIATE   o         E    OOo
 *     oOO           __.oo             oo.__           OOo
 *     oOO    __.--''     oo         oo     ''--.__    OOo
 *      oOO -'              ooooooooo              '- OOo
 *       oOO                /       \                OOo
 *        oOO     SW       /         \       SE     OOo
 *          oOO           /           \            OOo
 *            oO         /             \         OOo
 *               oOO    /       S       \     OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 *
 *  Horizontal slice (i.e. "viewed from the side") at current bot x-level:
 *
 *                       ooo OOO OOO ooo
 *                   oOO                 OOo
 *               oOO   |                 |   OOo
 *            oOO      |       UP        |      OOo
 *          oOO        |                 |        OOo
 *        oOO          |                 |          OOo
 *       oOO           |                 |           OOo
 *      oOO            |    ooooooooo    |            OOo
 *     oOO             |  oo         oo  |             OOo
 *     oOO              oo             oo              OOo
 *     oOO   S          o   IMMEDIATE   o         N    OOo
 *     oOO              oo             oo              OOo
 *     oOO             |  oo         oo  |             OOo
 *      oOO            |    ooooooooo    |            OOo
 *       oOO           |                 |           OOo
 *        oOO          |                 |          OOo
 *          oOO        |                 |         OOo
 *            oO       |      DOWN       |       OOo
 *               oOO   |                 |    OOo
 *                   oOO                 OOo
 *                       ooo OOO OOO ooo
 *
 *      |-----------------------| Distant Surrounding Radius
 *                     |--------| Immediate Surroundings Radius
 */
var Vicinity;
(function (Vicinity) {
    Vicinity["IMMEDIATE_SURROUNDINGS"] = "immediate";
    Vicinity["DISTANT_SURROUNDINGS_UP"] = "up";
    Vicinity["DISTANT_SURROUNDINGS_DOWN"] = "down";
    Vicinity["DISTANT_SURROUNDINGS_NOTH"] = "north";
    Vicinity["DISTANT_SURROUNDINGS_NORTHEAST"] = "northeast";
    Vicinity["DISTANT_SURROUNDINGS_EAST"] = "east";
    Vicinity["DISTANT_SURROUNDINGS_SOUTHEAST"] = "southeast";
    Vicinity["DISTANT_SURROUNDINGS_SOUTH"] = "south";
    Vicinity["DISTANT_SURROUNDINGS_SOUTHWEST"] = "southwest";
    Vicinity["DISTANT_SURROUNDINGS_WEST"] = "west";
    Vicinity["DISTANT_SURROUNDINGS_NORTHWEST"] = "northwest";
})(Vicinity || (exports.Vicinity = Vicinity = {}));
/**
 * Full-detail data structure (used internally) that represents the contents of the bot's
 * immediate surroundings.
 */
class ImmediateSurroundings {
    constructor(bot) {
        this.bot = bot;
        this.blocksToAllCoords = new Map();
        this.biomes = new Set();
    }
    getDTO() {
        return {
            visibleBlocks: Object.fromEntries([...this.blocksToAllCoords.entries()].map(([block, allCoords]) => [
                block,
                allCoords.map((coords) => [coords.x, coords.y, coords.z]),
            ])),
            visibleBiomes: Array.from(this.biomes).map((biomeId) => this.bot.registry.biomes[biomeId].name),
        };
    }
}
exports.ImmediateSurroundings = ImmediateSurroundings;
/**
 * Full-detail data structure (used internally) that represents the contents of the bot's
 * distant surroundings in a specific direction.
 */
class DistantSurroundingsInADirection {
    constructor(bot) {
        this.bot = bot;
        this.blocksToCounts = new Map();
        this.blocksToClosestCoords = new Map();
        this.biomesToClosestCoords = new Map();
    }
    getDTO() {
        return {
            visibleBlockCounts: Object.fromEntries(this.blocksToCounts),
            visibleBiomes: Array.from(this.biomesToClosestCoords.keys()).map((biomeId) => this.bot.registry.biomes[biomeId].name),
        };
    }
}
exports.DistantSurroundingsInADirection = DistantSurroundingsInADirection;
/**
 * Full-detail data structure (used internally) that represents the bot's surroundings.
 *
 * NOTE: The underscore prefix in the class name is used to differentiate this class from
 * the one exported in `src/core/environment/surroundings/surroundings.ts`, which is the
 * fully-featured version intended to be used outside of `src/core/environment/surroundings/`.
 *
 */
class _Surroundings {
    constructor(bot, radii) {
        this.bot = bot;
        this.radii = radii;
        this.immediate = new ImmediateSurroundings(bot);
        this.distant = new Map(Object.values(Direction).map((dir) => [
            dir,
            new DistantSurroundingsInADirection(bot),
        ]));
    }
    getDTO() {
        return {
            immediateSurroundings: this.immediate.getDTO(),
            distantSurroundings: Object.fromEntries([...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])),
        };
    }
}
exports._Surroundings = _Surroundings;

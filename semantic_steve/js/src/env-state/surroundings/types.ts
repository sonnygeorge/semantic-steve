import { Vec3 } from "vec3";
import { Bot } from "mineflayer";

//=======
// Enums
//=======

/**
 * Keys used for the DistantSurroundings mapping—i.e., the 10 "directions" that we slice
 * the _distant surroundings_ into.
 */
export enum Direction {
  UP = "up",
  DOWN = "down",
  NORTH = "north",
  NORTHEAST = "northeast",
  EAST = "east",
  SOUTHEAST = "southeast",
  SOUTH = "south",
  SOUTHWEST = "southwest",
  WEST = "west",
  NORTHWEST = "northwest",
}

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
export enum Vicinity {
  IMMEDIATE_SURROUNDINGS = "immediate",
  DISTANT_SURROUNDINGS_UP = Direction.UP,
  DISTANT_SURROUNDINGS_DOWN = Direction.DOWN,
  DISTANT_SURROUNDINGS_NORTH = Direction.NORTH,
  DISTANT_SURROUNDINGS_NORTHEAST = Direction.NORTHEAST,
  DISTANT_SURROUNDINGS_EAST = Direction.EAST,
  DISTANT_SURROUNDINGS_SOUTHEAST = Direction.SOUTHEAST,
  DISTANT_SURROUNDINGS_SOUTH = Direction.SOUTH,
  DISTANT_SURROUNDINGS_SOUTHWEST = Direction.SOUTHWEST,
  DISTANT_SURROUNDINGS_WEST = Direction.WEST,
  DISTANT_SURROUNDINGS_NORTHWEST = Direction.NORTHWEST,
}

//========================
// Immediate Surroundings
//========================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `ImmediateSurroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type ImmediateSurroundingsDTO = {
  visibleBlocks: { [key: string]: [number, number, number][] };
  visibleBiomes: string[];
  visibleItems: { [key: string]: [number, number, number][] };
};

/**
 * Full-detail data structure (used internally) that represents the contents of the bot's
 * immediate surroundings.
 */
export class ImmediateSurroundings {
  bot: Bot;
  blocksToAllCoords: Map<string, Vec3[]>;
  biomes: Set<number>;
  // this is currently dropped item name mapped to coords, not the entity name.
  itemEntitiesToAllCoords: Map<string, Vec3[]>;

  constructor(bot: Bot) {
    this.bot = bot;
    this.blocksToAllCoords = new Map<string, Vec3[]>();
    this.biomes = new Set<number>();
    this.itemEntitiesToAllCoords = new Map<string, Vec3[]>();
  }

  getDTO(): ImmediateSurroundingsDTO {
    return {
      visibleBlocks: Object.fromEntries(
        [...this.blocksToAllCoords.entries()].map(([block, allCoords]) => [
          block,
          allCoords.map((coords) => [coords.x, coords.y, coords.z]),
        ]),
      ),
      visibleBiomes: Array.from(this.biomes).map(
        (biomeId) => this.bot.registry.biomes[biomeId].name,
      ),
      visibleItems: Object.fromEntries(
        [...this.itemEntitiesToAllCoords.entries()].map(([item, allCoords]) => [
          item,
          allCoords.map((coords) => [
            Number(coords.x.toFixed(2)),
            Number(coords.y.toFixed(2)),
            Number(coords.z.toFixed(2)),
          ]),
        ]),
      ),
    };
  }
}

//=====================================
// Distant surroundings in a direction
//=====================================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `DistantSurroundingsInADirection`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type DistantSurroundingsInADirectionDTO = {
  visibleBlockCounts: { [key: string]: number };
  visibleBiomes: string[];
  visibleItemCounts: { [key: string]: number };
};

/**
 * Full-detail data structure (used internally) that represents the contents of the bot's
 * distant surroundings in a specific direction.
 */
export class DistantSurroundingsInADirection {
  bot: Bot;
  blocksToCounts: Map<string, number>;
  blocksToClosestCoords: Map<string, Vec3>;
  biomesToClosestCoords: Map<number, Vec3>;
  itemEntitiesToCounts: Map<string, number>;
  itemEntitiesToClosestCoords: Map<string, Vec3>;

  constructor(bot: Bot) {
    this.bot = bot;
    this.blocksToCounts = new Map<string, number>();
    this.blocksToClosestCoords = new Map<string, Vec3>();
    this.biomesToClosestCoords = new Map<number, Vec3>();
    this.itemEntitiesToCounts = new Map<string, number>();
    this.itemEntitiesToClosestCoords = new Map<string, Vec3>();
  }

  getDTO(): DistantSurroundingsInADirectionDTO {
    return {
      visibleBlockCounts: Object.fromEntries(this.blocksToCounts),
      visibleBiomes: Array.from(this.biomesToClosestCoords.keys()).map(
        (biomeId) => this.bot.registry.biomes[biomeId].name,
      ),
      visibleItemCounts: Object.fromEntries(this.itemEntitiesToCounts),
    };
  }
}

//======================
// Distant surroundings
//======================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `DistantSurroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type DistantSurroundingsDTO = {
  [key: string]: DistantSurroundingsInADirectionDTO;
};

/**
 * Full-detail data structure (used internally) that represents the contents of the bot's
 * distant surroundings (in all directions).
 */
export type DistantSurroundings = Map<
  Direction,
  DistantSurroundingsInADirection
>;

//==============
// Surroundings
//==============

/**
 * The radii that parameterize the geometry of the `Vicinity`s of the bot's surroundings.
 */
export type SurroundingsRadii = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `Surroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type SurroundingsDTO = {
  immediateSurroundings: ImmediateSurroundingsDTO;
  distantSurroundings: DistantSurroundingsDTO;
};

/**
 * Full-detail data structure (used internally) that represents the bot's surroundings.
 *
 * NOTE: The underscore prefix in the class name is used to differentiate this class from
 * the one exported in `src/core/environment/surroundings/surroundings.ts`, which is the
 * fully-featured version intended to be used outside of `src/core/environment/surroundings/`.
 *
 */
export class _Surroundings {
  bot: Bot;
  radii: SurroundingsRadii;
  immediate: ImmediateSurroundings;
  distant: DistantSurroundings;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
    this.immediate = new ImmediateSurroundings(bot);
    this.distant = new Map(
      Object.values(Direction).map((dir) => [
        dir,
        new DistantSurroundingsInADirection(bot),
      ]),
    );
  }

  getDTO(): SurroundingsDTO {
    return {
      immediateSurroundings: this.immediate.getDTO(),
      distantSurroundings: Object.fromEntries(
        [...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()]),
      ),
    };
  }
}

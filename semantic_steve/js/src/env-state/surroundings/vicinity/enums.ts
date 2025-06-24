// TODO: Change these to types

/**
 * Keys identifying the 10 "directions" that slice the *distant* surroundings.
 *
 * A subset of the 11 "vicinities" in the bot's surroundings (which additionally includes
 * the immediate surroundings vicinity).
 */
export enum DirectionName {
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
 */
export enum VicinityName {
  IMMEDIATE_SURROUNDINGS = "immediate",
  DISTANT_SURROUNDINGS_UP = DirectionName.UP,
  DISTANT_SURROUNDINGS_DOWN = DirectionName.DOWN,
  DISTANT_SURROUNDINGS_NORTH = DirectionName.NORTH,
  DISTANT_SURROUNDINGS_NORTHEAST = DirectionName.NORTHEAST,
  DISTANT_SURROUNDINGS_EAST = DirectionName.EAST,
  DISTANT_SURROUNDINGS_SOUTHEAST = DirectionName.SOUTHEAST,
  DISTANT_SURROUNDINGS_SOUTH = DirectionName.SOUTH,
  DISTANT_SURROUNDINGS_SOUTHWEST = DirectionName.SOUTHWEST,
  DISTANT_SURROUNDINGS_WEST = DirectionName.WEST,
  DISTANT_SURROUNDINGS_NORTHWEST = DirectionName.NORTHWEST,
}

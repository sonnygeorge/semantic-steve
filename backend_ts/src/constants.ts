export enum Direction {
  EAST = "EAST",
  NORTHEAST = "NORTHEAST",
  NORTH = "NORTH",
  NORTHWEST = "NORTHWEST",
  WEST = "WEST",
  SOUTHWEST = "SOUTHWEST",
  SOUTH = "SOUTH",
  SOUTHEAST = "SOUTHEAST",
}

export const DIRECTION_ANGLES: Record<Direction, [number, number]> = {
  [Direction.EAST]: [-112.5, -67.5],
  [Direction.SOUTHEAST]: [-67.5, -22.5],
  [Direction.SOUTH]: [-22.5, 22.5],
  [Direction.SOUTHWEST]: [22.5, 67.5],
  [Direction.WEST]: [67.5, 112.5],
  [Direction.NORTHWEST]: [112.5, 157.5],
  [Direction.NORTH]: [157.5, -157.5], // Wraps around -180
  [Direction.NORTHEAST]: [-157.5, -112.5],
};

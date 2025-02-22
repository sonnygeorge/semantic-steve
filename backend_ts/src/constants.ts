export enum Direction {
  EAST = "EAST",
  NORTHEAST = "NORTHEAST",
  NORTH = "NORTH",
  NORTHWEST = "NORTHWEST",
  WEST = "WEST",
  SOUTHWEST = "SOUTHWEST",
  SOUTH = "SOUTH",
  SOUTHEAST = "SOUTHEAST",

  ALL = "ALL",
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

[Direction.ALL]: [-180, 180],
};


/**
 * 
 * @param yaw Assume between -180 and 180
 * @returns 
 */
export function findDir(yaw: number): Direction {
  for (const [dir, [min, max]] of Object.entries(DIRECTION_ANGLES)) {
    if (min < max) {
      // Normal case (min to max is continuous)
      if (yaw >= min && yaw < max) return dir as Direction;
    } else {
      // Wrapping case (e.g., WEST spans from 157.5 to -157.5)
      if (yaw >= min || yaw < max) return dir as Direction;
    }
  }
  return Direction.NORTH; // Should never happen
}
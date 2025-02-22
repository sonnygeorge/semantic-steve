import { Direction, DIRECTION_ANGLES } from "../constants";
import type { Vec3 } from "vec3";

export function offsetIsWithinDirection(target: Vec3, src: Vec3, direction: Direction): boolean {
  const [min, max] = DIRECTION_ANGLES[direction];

  const dx = target.x - src.x;
  const dz = target.z - src.z;
  let yaw = (Math.atan2(-dz, dx) * 180) / Math.PI; // Normalize to [0, 360]

  if (min < max) {
    // Normal case (min to max is continuous)
    if (yaw >= min && yaw < max) return true;
  } else {
    // Wrapping case (e.g., WEST spans from 157.5 to -157.5)
    if (yaw >= min || yaw < max) return true;
  }
  return false;
}

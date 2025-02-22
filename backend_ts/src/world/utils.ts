import { Direction, DIRECTION_ANGLES } from "../constants";
import type {Vec3} from "vec3";

export function offsetIsWithinDirection(target: Vec3, src: Vec3, direction: Direction): boolean {
    const [minAngle, maxAngle] = DIRECTION_ANGLES[direction];
    const dx = target.x - src.x;
    const dz = target.z - src.z;
    let angle = (Math.atan2(-dz, dx) * 180) / Math.PI; // Normalize to [0, 360]
    return minAngle <= angle && angle < maxAngle;
  }

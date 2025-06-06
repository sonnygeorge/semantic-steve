import { Vec3 } from "vec3";

export const asyncSleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Calculates a point on a quadrilateral face using bilinear interpolation.
 * P = (1-u)(1-v)P₁ + u(1-v)P₂ + (1-u)vP₃ + uvP₄
 *
 * @param u - Normalized u-coordinate [0,1]
 * @param v - Normalized v-coordinate [0,1]
 * @param c1 - First corner of the quadrilateral
 * @param c2 - Second corner of the quadrilateral
 * @param c3 - Third corner of the quadrilateral
 * @param c4 - Fourth corner of the quadrilateral
 * @returns Interpolated point
 */
export function bilinearInterpolate(
  u: number,
  v: number,
  c1: Vec3,
  c2: Vec3,
  c3: Vec3,
  c4: Vec3,
): Vec3 {
  function interpolateComponent(component: "x" | "y" | "z"): number {
    // Term 1: (1-u)(1-v)P₁ - Bottom-left corner contribution
    const term1 = (1 - u) * (1 - v) * c1[component];
    // Term 2: u(1-v)P₂ - Bottom-right corner contribution
    const term2 = u * (1 - v) * c2[component];
    // Term 3: (1-u)vP₃ - Top-left corner contribution
    const term3 = (1 - u) * v * c3[component];
    // Term 4: uvP₄ - Top-right corner contribution
    const term4 = u * v * c4[component];
    // Sum all four terms to get the interpolated component
    return term1 + term2 + term3 + term4;
  }

  return new Vec3(
    interpolateComponent("x"),
    interpolateComponent("y"),
    interpolateComponent("z"),
  );
}

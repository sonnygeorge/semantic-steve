import { Vec3 } from "vec3";

export const asyncSleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export class Symmetrical3DArray<T> {
  private array: T[][][];
  private defaultValue: T | (() => T);
  public idxsWithSetValues = new Map<string, [number, number, number]>();

  constructor(dimension: number, defaultValue: T | (() => T)) {
    this.defaultValue = defaultValue;
    const defaultFactory =
      typeof defaultValue === "function"
        ? (defaultValue as () => T)
        : () => defaultValue as T;
    this.array = Array.from({ length: dimension }, () =>
      Array.from({ length: dimension }, () =>
        Array.from({ length: dimension }, () => defaultFactory())
      )
    );
  }

  public serializeIdx(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public deserializeIdx(key: string): [number, number, number] {
    const parts = key.split(",");
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  }

  public get(x: number, y: number, z: number): T {
    return this.array[x][y][z];
  }

  public set(x: number, y: number, z: number, value: T): void {
    this.array[x][y][z] = value;
    this.idxsWithSetValues.set(this.serializeIdx(x, y, z), [x, y, z]);
  }

  public unset(x: number, y: number, z: number): void {
    const defaultFactory =
      typeof this.defaultValue === "function"
        ? (this.defaultValue as () => T)
        : () => this.defaultValue as T;
    this.array[x][y][z] = defaultFactory();
    this.idxsWithSetValues.delete(this.serializeIdx(x, y, z));
  }
}

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
  c4: Vec3
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
    interpolateComponent("z")
  );
}

export function serializeVec3(vec: Vec3): string {
  return `${vec.x},${vec.y},${vec.z}`;
}

export function deserializeVec3(str: string): Vec3 {
  const [x, y, z] = str.split(",").map(Number);
  return new Vec3(x, y, z);
}

export class ThreeDimensionalOrientation {
  horizontalAngle: number; // radians
  verticalAngle: number; // radians
  directionVector: Vec3; // Normalized direction vector

  constructor(
    params:
      | Vec3
      | { horizontalAngle: number; verticalAngle: number }
      | { towards: { x: number; y: number; z: number } }
  ) {
    if (params instanceof Vec3) {
      this.directionVector = params.normalize();
      this.horizontalAngle = Math.atan2(
        this.directionVector.x,
        this.directionVector.z
      );
      this.verticalAngle = Math.asin(this.directionVector.y);
    } else if ("horizontalAngle" in params && "verticalAngle" in params) {
      this.horizontalAngle = params.horizontalAngle;
      this.verticalAngle = params.verticalAngle;
      this.directionVector = new Vec3(
        Math.sin(this.horizontalAngle) * Math.cos(this.verticalAngle),
        Math.sin(this.verticalAngle),
        Math.cos(this.horizontalAngle) * Math.cos(this.verticalAngle)
      ).normalize();
    } else {
      const { x, y, z } = params.towards;
      this.horizontalAngle = Math.atan2(x, z);
      const horizontalDistance = Math.sqrt(x * x + z * z);
      this.verticalAngle = Math.atan2(y, horizontalDistance);
      this.directionVector = new Vec3(
        Math.sin(this.horizontalAngle) * Math.cos(this.verticalAngle),
        Math.sin(this.verticalAngle),
        Math.cos(this.horizontalAngle) * Math.cos(this.verticalAngle)
      ).normalize();
    }
  }

  public serialize(): string {
    return `${this.horizontalAngle.toFixed(4)},${this.verticalAngle.toFixed(
      4
    )}`;
  }
}

/**
 * Generates uniformly distributed orientations across the 3D sphere
 * using the Fibonacci spiral method for optimal uniform distribution.
 */
export function* generateUniformlyDistributed3DOrientations(
  numOrientations: number
): Generator<ThreeDimensionalOrientation> {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians

  for (let i = 0; i < numOrientations; i++) {
    // Fibonacci spiral method for uniform sphere distribution
    const y = 1 - (2 * i) / (numOrientations - 1); // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y

    const theta = goldenAngle * i; // golden angle increment

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    yield new ThreeDimensionalOrientation({
      towards: { x, y, z },
    });
  }
}

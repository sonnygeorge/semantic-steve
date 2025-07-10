import { Vec3 } from "vec3";
import { HEALPixSpatialHashData } from "./types";

export class HEALPixSpatialHash {
  public data: HEALPixSpatialHashData;
  private regionsToDirections: Map<number, Vec3[]>;
  public avgNumDirectionsPerRegion: number;

  constructor(
    data: HEALPixSpatialHashData,
    vectors: Vec3[] | IterableIterator<Vec3>
  ) {
    this.data = data;
    // Initialize region map
    this.regionsToDirections = new Map();

    // Classify all input vectors
    let numVectors = 0;
    for (const vector of vectors) {
      numVectors++;
      const region = this.getRegionOfDirection(vector);
      if (!this.regionsToDirections.has(region)) {
        this.regionsToDirections.set(region, []);
      }
      this.regionsToDirections.get(region)!.push(vector);
    }

    // Calculate average number of directions per region
    this.avgNumDirectionsPerRegion = numVectors / this.data.npix;
  }

  getRegionOfDirection(vecNorm: Vec3): number {
    const x = vecNorm.x;
    const y = vecNorm.y;
    const z = vecNorm.z;

    // Determine which cube face this vector points to
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    let face: number;
    let u: number;
    let v: number;

    if (absX >= absY && absX >= absZ) {
      face = x > 0 ? 0 : 1;
      u = x > 0 ? -z / absX : z / absX;
      v = y / absX;
    } else if (absY >= absX && absY >= absZ) {
      face = y > 0 ? 2 : 3;
      u = x / absY;
      v = y > 0 ? -z / absY : z / absY;
    } else {
      face = z > 0 ? 4 : 5;
      u = x / absZ;
      v = y / absZ;
    }

    // Convert to [0,1] range
    u = (u + 1) * 0.5;
    v = (v + 1) * 0.5;

    // Look up in face grid
    const gridU = Math.floor(u * this.data.gridSize);
    const gridV = Math.floor(v * this.data.gridSize);

    // Clamp to grid bounds
    const clampedU = Math.max(0, Math.min(this.data.gridSize - 1, gridU));
    const clampedV = Math.max(0, Math.min(this.data.gridSize - 1, gridV));

    const gridKey = `${clampedU},${clampedV}`;
    return this.data.faceGrids[face][gridKey];
  }

  getRegionNeighbors(region: number): number[] {
    return this.data.adjacency[region.toString()] || [];
  }

  getRegion(region: number): Vec3[] {
    return this.regionsToDirections.get(region) || [];
  }

  *iterRegions(): IterableIterator<[number, Vec3[]]> {
    for (const [region, vectors] of this.regionsToDirections.entries()) {
      yield [region, vectors];
    }
  }
}

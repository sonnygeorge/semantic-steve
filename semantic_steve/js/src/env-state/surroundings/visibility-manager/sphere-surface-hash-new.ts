// Starter code for you

import { Vec3 } from "vec3";
import {
  ThreeDimOrientation,
  OrientationString,
  SphereSurfaceHashRegionString,
} from "./types";
import { serializeVec3 } from "../../../utils/generic";
import { RelativeVoxelOffsetString } from "../../../types";

const TARGET_NUM_VOXELS_PER_HASH_REGION = 3;

/**
 * Generates a map of orientations to voxel offsets on the surface of a sphere
 * with a given radius.
 */
function getMapOfOrientationsToSphereSurfaceVoxelOffsets(
  sphereRadius: number
): [Map<OrientationString, Vec3>, Map<OrientationString, ThreeDimOrientation>] {
  if (!Number.isInteger(sphereRadius) || sphereRadius <= 0) {
    throw new Error("sphereRadius must be a positive integer");
  }
  const orientationsToSurfaceVoxelOffsets: Map<OrientationString, Vec3> =
    new Map();
  const orientations: Map<OrientationString, ThreeDimOrientation> = new Map();
  const visited = new Set<RelativeVoxelOffsetString>();
  for (let x = -sphereRadius; x <= sphereRadius; x++) {
    for (let y = -sphereRadius; y <= sphereRadius; y++) {
      for (let z = -sphereRadius; z <= sphereRadius; z++) {
        // Skip zero vector to avoid degenerate cases
        if (x === 0 && y === 0 && z === 0) continue;
        const voxelOffset: Vec3 = new Vec3(x, y, z);
        const voxelOffsetString = serializeVec3(voxelOffset);
        const distanceToVoxel = Math.sqrt(x * x + y * y + z * z);
        if (Math.abs(distanceToVoxel - sphereRadius) <= 0.5) {
          const orientation = new ThreeDimOrientation({ towards: voxelOffset });
          if (!visited.has(voxelOffsetString)) {
            const key = orientation.serialize();
            orientationsToSurfaceVoxelOffsets.set(key, voxelOffset);
            orientations.set(key, orientation);
            visited.add(voxelOffsetString);
          }
        }
      }
    }
  }
  return [orientationsToSurfaceVoxelOffsets, orientations];
}

/**
 * Generates uniformly distributed orientations across the 3D sphere
 * using the Fibonacci spiral method for optimal uniform distribution.
 */
export function* generateUniformlyDistributed3DOrientations(
  numOrientations: number
): Generator<ThreeDimOrientation> {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
  for (let i = 0; i < numOrientations; i++) {
    // Fibonacci spiral method for uniform sphere distribution
    const y = 1 - (2 * i) / (numOrientations - 1); // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y
    const theta = goldenAngle * i; // golden angle increment
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    yield new ThreeDimOrientation({
      towards: new Vec3(x, y, z),
    });
  }
}

// Use the utils serializeVec3 and deserializeVec3 to work these!
export type GridPartitionString = string; // e.g. "0,0,0" for grid cell at (0, 0, 0)

export class SphereSurfaceHash {
  public radius: number;

  private orientations: Map<OrientationString, ThreeDimOrientation>;
  private orientationsToSurfaceVoxelOffsets: Map<OrientationString, Vec3>;

  private grid: Map<SphereSurfaceHashRegionString, OrientationString[]> =
    new Map();

  private regionCenterOrientationsToRegions: Map<
    OrientationString,
    SphereSurfaceHashRegionString
  > = new Map();
  private regionsToRegionCenterOrientations: Map<
    SphereSurfaceHashRegionString,
    OrientationString
  > = new Map();

  



  // Occlusion data
  public voxelsToOccludedRegions: Map<
    RelativeVoxelOffsetString,
    SphereSurfaceHashRegionString[]
  > = new Map();
  public voxelsToOcclusionRadii: Map<RelativeVoxelOffsetString, number> =
    new Map();

  constructor(sphereRadius: number) {
    this.radius = sphereRadius;
    [this.orientationsToSurfaceVoxelOffsets, this.orientations] =
      getMapOfOrientationsToSphereSurfaceVoxelOffsets(sphereRadius);
    this.avgNumOrientationsPerRegion =
      this.buildClusteredSpatialHashGrid(numTargetClusters);
    this.buildGridNeighbors();
    this.calculateOcclusionDataOfVoxelsInSphere();
  }

  /**
   * Builds the spatial hash grid using a clustering approach for uniformly shaped surface regions.
   * 1. Generate N uniformly distributed cluster centers
   * 2. Assign each orientation to nearest cluster center
   * 3. Map clusters to 3D grid cells for O(1) lookup
   */
  private buildClusteredSpatialHashGrid(): number {
    const numClusters = Math.floor(
      this.orientations.size / TARGET_NUM_VOXELS_PER_HASH_REGION
    );
    const clusterCenters: ThreeDimOrientation[] = Array.from(
      generateUniformlyDistributed3DOrientations(numClusters)
    );
    // TODO
  }

  /**
   * Gets the region for a given orientation in O(1) time
   */
  public getRegionOfOrientation(
    orientation: ThreeDimOrientation
  ): SphereSurfaceHashRegionString {
    // TODO
  }

  private buildGridNeighbors(): void {
    // Don't implement
  }

  private calculateOcclusionDataOfVoxelsInSphere(): void {
    // Don't implement
  }

  public get(regionKey: SphereSurfaceHashRegionString): OrientationString[] {
    // TODO
  }

  public getNeighboringRegions(
    regionKey: SphereSurfaceHashRegionString
  ): string[] {
    return this.regionNeighbors.get(regionKey) || [];
  }
}

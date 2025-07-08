import { Vec3 } from "vec3";
import {
  SphereSurfaceHashConfig,
  ThreeDimOrientation,
  OrientationString,
  SphereSurfaceHashRegionString as SphereSurfaceRegionString,
} from "./types";
import { serializeVec3 } from "../../../utils/generic";
import { RelativeVoxelOffsetString } from "../../../types";

const TARGET_VOXELS_PER_CELL = 3;

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

export class SphereSurfaceHash {
  public readonly config: SphereSurfaceHashConfig;
  public readonly avgNumOrientationsPerRegion: number;
  private _maxThetaIdx?: number;
  private _maxPhiIdx?: number;
  public radius: number;
  private orientations: Map<OrientationString, ThreeDimOrientation>;
  private orientationsToSurfaceVoxelOffsets: Map<OrientationString, Vec3>;
  private gridNeighbors: Map<SphereSurfaceRegionString, string[]> = new Map();
  private grid: Map<SphereSurfaceRegionString, OrientationString[]> = new Map();
  private orientationsToGridRegions: Map<
    OrientationString,
    SphereSurfaceRegionString
  > = new Map();
  public voxelsToOccludedRegions: Map<
    RelativeVoxelOffsetString,
    SphereSurfaceRegionString[]
  > = new Map();
  public voxelsToOcclusionRadii: Map<RelativeVoxelOffsetString, number> =
    new Map();

  constructor(sphereRadius: number) {
    this.radius = sphereRadius;
    [this.orientationsToSurfaceVoxelOffsets, this.orientations] =
      getMapOfOrientationsToSphereSurfaceVoxelOffsets(sphereRadius);
    this.config = this.calculateOptimalConfig(this.orientations.size);
    this.avgNumOrientationsPerRegion = this.buildSpatialHashGrid();
    this.buildGridNeighbors();
    this.calculateOcclusionDataOfVoxelsInSphere();
  }

  public get maxThetaIdx(): number {
    if (this._maxThetaIdx === undefined) {
      this._maxThetaIdx =
        Math.floor((2 * Math.PI) / this.config.thetaStepSize) - 1;
    }
    return this._maxThetaIdx;
  }

  public get maxPhiIdx(): number {
    if (this._maxPhiIdx === undefined) {
      this._maxPhiIdx = Math.floor(Math.PI / this.config.phiStepSize) - 1;
    }
    return this._maxPhiIdx;
  }

  private calculateOptimalConfig(voxelCount: number): SphereSurfaceHashConfig {
    // Ensure we have a reasonable minimum number of cells
    let targetCellCount = Math.floor(voxelCount / TARGET_VOXELS_PER_CELL);
    targetCellCount = Math.max(1, targetCellCount);

    // For a sphere surface, we want roughly equal angular spacing
    // The surface area element is sin(phi) * dtheta * dphi, so we need more
    // theta divisions than phi divisions to account for the sin(phi) factor
    const numThetaCells = Math.ceil(Math.sqrt(targetCellCount * 2));
    const numPhiCells = Math.ceil(Math.sqrt(targetCellCount / 2));

    return {
      thetaStepSize: (2 * Math.PI) / numThetaCells,
      phiStepSize: Math.PI / numPhiCells,
      thetaRange: [0, 2 * Math.PI], // Fixed: theta is now consistently [0, 2π)
      phiRange: [0, Math.PI],
    };
  }

  public getRegionOfOrientation(
    orientation: ThreeDimOrientation
  ): SphereSurfaceRegionString {
    const { theta, phi } = orientation.sphericalAngles;

    // theta is already in [0, 2π) range from our fixed sphericalAngles getter
    const thetaIndex = Math.floor(theta / this.config.thetaStepSize);
    const phiIndex = Math.floor(phi / this.config.phiStepSize);

    // Ensure indices stay within bounds (handle edge cases)
    const clampedThetaIdx = Math.max(0, Math.min(thetaIndex, this.maxThetaIdx));
    const clampedPhiIdx = Math.max(0, Math.min(phiIndex, this.maxPhiIdx));

    return `${clampedThetaIdx},${clampedPhiIdx}` as SphereSurfaceRegionString;
  }

  private buildSpatialHashGrid(): number {
    for (const [orientationKey, orientation] of this.orientations) {
      const regionKey = this.getRegionOfOrientation(orientation);
      if (!this.grid.has(regionKey)) {
        this.grid.set(regionKey, []);
      }
      this.grid.get(regionKey)!.push(orientationKey);
      this.orientationsToGridRegions.set(orientationKey, regionKey);
    }

    // Calculate average orientations per region
    const totalOrientations = Array.from(this.grid.values()).reduce(
      (sum, orientations) => sum + orientations.length,
      0
    );
    const regionCount = this.grid.size;
    return regionCount > 0 ? totalOrientations / regionCount : 0;
  }

  private buildGridNeighbors(): void {
    // Store the neighbors for each region
    for (const [regionKey, orientationsInRegion] of this.grid) {
      // Use the first orientation in the region as representative
      // (or we could compute the centroid, but first orientation should work fine)
      const representativeOrientationKey = orientationsInRegion[0];
      const representativeOrientation = this.orientations.get(
        representativeOrientationKey
      )!;

      const neighbors = new Set<string>(); // Use Set to avoid duplicates

      // Use step sizes that are slightly larger than grid size to ensure we reach neighboring regions
      // but not so large that we skip over them
      const thetaOffset = this.config.thetaStepSize * 0.9; // Slightly less than full step
      const phiOffset = this.config.phiStepSize * 0.9;

      const offsetOrientations = [
        representativeOrientation.plusAngularOffset({
          theta: thetaOffset,
          phi: 0,
        }), // +theta
        representativeOrientation.plusAngularOffset({
          theta: -thetaOffset,
          phi: 0,
        }), // -theta
        representativeOrientation.plusAngularOffset({
          theta: 0,
          phi: phiOffset,
        }), // +phi
        representativeOrientation.plusAngularOffset({
          theta: 0,
          phi: -phiOffset,
        }), // -phi
        // Diagonal neighbors
        representativeOrientation.plusAngularOffset({
          theta: thetaOffset,
          phi: phiOffset,
        }),
        representativeOrientation.plusAngularOffset({
          theta: thetaOffset,
          phi: -phiOffset,
        }),
        representativeOrientation.plusAngularOffset({
          theta: -thetaOffset,
          phi: phiOffset,
        }),
        representativeOrientation.plusAngularOffset({
          theta: -thetaOffset,
          phi: -phiOffset,
        }),
      ];

      // Find which grid regions these offset orientations belong to
      for (const offsetOrientation of offsetOrientations) {
        const neighborRegionKey =
          this.getRegionOfOrientation(offsetOrientation);

        // Only add as neighbor if it's a different region and actually exists
        if (
          neighborRegionKey !== regionKey &&
          this.grid.has(neighborRegionKey)
        ) {
          neighbors.add(neighborRegionKey);
        }
      }

      this.gridNeighbors.set(regionKey, Array.from(neighbors));
    }
  }

  private calculateOcclusionDataOfVoxelsInSphere(): void {
    // Iterate through all possible voxel positions within the sphere radius

    for (let xOffset = -this.radius; xOffset <= this.radius; xOffset++) {
      for (let yOffset = -this.radius; yOffset <= this.radius; yOffset++) {
        for (let zOffset = -this.radius; zOffset <= this.radius; zOffset++) {
          // Skip origin voxel (bot's position)
          if (xOffset === 0 && yOffset === 0 && zOffset === 0) continue;

          const voxelOffset = new Vec3(xOffset, yOffset, zOffset);

          const distance = voxelOffset.distanceTo(new Vec3(0, 0, 0));

          // Only consider voxels within reasonable range (up to sphere radius)
          if (distance > this.radius) continue;

          const voxelOffsetKey = serializeVec3(
            voxelOffset
          ) as RelativeVoxelOffsetString;

          // Calculate angular radius: approximate the voxel as a sphere with radius 0.495
          // Approx. half the height of the voxel at the given distance
          const angularOcclusionRadius = Math.atan(0.495 / distance);

          this.voxelsToOcclusionRadii.set(
            voxelOffsetKey,
            angularOcclusionRadius
          );

          // Get the orientation that points toward this voxel's center
          const centerOrientation = new ThreeDimOrientation({
            towards: voxelOffset,
          });

          // Find all grid regions that would be wholly occluded by this voxel
          const occludedRegions: SphereSurfaceRegionString[] = [];

          // Check each grid region to see if it's wholly within the occlusion area
          for (const [regionKey, orientationsInRegion] of this.grid) {
            let regionIsWhollyOccluded = true;

            // A region is wholly occluded if ALL orientations in it are within the angular radius
            for (const orientationKey of orientationsInRegion) {
              const orientation = this.orientations.get(orientationKey)!;

              // Calculate angular distance between this orientation and the voxel center
              const angularDistance =
                centerOrientation.angularDistanceTo(orientation);

              // If any orientation in the region is outside the occlusion radius,
              // the region is not wholly occluded
              if (angularDistance > angularOcclusionRadius) {
                regionIsWhollyOccluded = false;
                break;
              }
            }

            if (regionIsWhollyOccluded) {
              occludedRegions.push(regionKey);
            }
          }

          this.voxelsToOccludedRegions.set(voxelOffsetKey, occludedRegions);
        }
      }
    }
    console.log(
      `voxelsToOccludedRegions.size: ${this.voxelsToOccludedRegions.size}`
    );
  }

  public get(regionKey: SphereSurfaceRegionString): OrientationString[] {
    return this.grid.get(regionKey) || [];
  }

  public getNeighboringRegions(regionKey: SphereSurfaceRegionString): string[] {
    return this.gridNeighbors.get(regionKey) || [];
  }
}

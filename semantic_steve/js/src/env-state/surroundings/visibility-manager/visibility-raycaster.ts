import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { ThreeDimOrientation, OrientationString } from "./types";
import { serializeVec3 } from "../../../utils/generic";
import { RelativeVoxelOffsetString } from "../../../types";
import { Block as PBlock } from "prismarine-block";
import { HEALPixSpatialHash } from "./healpix-hash";

function getOrientationsToSphereSurfaceVoxelOffsets(
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

export class VisibilityRaycaster {
  private bot: Bot;
  private orientations: Map<OrientationString, ThreeDimOrientation>;
  // TODO: We don't need the below
  private orientationsToSurfaceVoxelOffsets: Map<OrientationString, Vec3>;
  private sphereSpatialHash: HEALPixSpatialHash;
  private radius: number;
  private raycastStartRegion: number;
  // TODO: voxelsToRays (don't raycast again if we know a block is )
  private voxelsToOcclusionRadii: Map<RelativeVoxelOffsetString, number> =
    new Map();
  private voxelsToOccludedRegions: Map<RelativeVoxelOffsetString, number[]> =
    new Map();

  constructor(bot: Bot, radiusOfInterest: number) {
    if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
      throw new Error("radiusOfInterest must be a positive integer");
    }
    this.bot = bot;
    this.radius = radiusOfInterest;

    [this.orientationsToSurfaceVoxelOffsets, this.orientations] =
      getOrientationsToSphereSurfaceVoxelOffsets(this.radius);
    console.log(
      `Got ${this.orientations.size} surface voxels for sphere radius ${this.radius}`
    );

    this.sphereSpatialHash = new HEALPixSpatialHash(
      [...this.orientations.values()].map((orientation) => orientation.vecNorm)
    );

    this.raycastStartRegion = this.sphereSpatialHash.getRegionOfDirection(
      new ThreeDimOrientation({ theta: 0, phi: Math.PI - 0.01 }).vecNorm
    ); // Straight down from the bot's pov

    this.calculateOcclusions();
  }

  private calculateOcclusions(): void {
    // Iterate through all possible voxel positions within the sphere radius
    console.log("Calculating occlusions...");

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

          // Approximate the voxel as a sphere with radius 0.495 at the given distance
          const angularOcclusionRadius = Math.atan(0.495 / distance);

          this.voxelsToOcclusionRadii.set(
            voxelOffsetKey,
            angularOcclusionRadius
          );

          // Get the orientation that points toward this voxel's center
          const centerOrientation = new ThreeDimOrientation({
            towards: voxelOffset,
          });

          // Find all regions that would be wholly occluded by this voxel
          const occludedRegions: number[] = [];

          // Check each region to see if it's wholly within the occlusion area
          for (const [
            regionKey,
            orientationsInRegion,
          ] of this.sphereSpatialHash.iterRegions()) {
            let regionIsWhollyOccluded = true;

            // A region is wholly occluded if ALL orientations in it are within the angular radius
            for (const vecNorm of orientationsInRegion) {
              const orientation = new ThreeDimOrientation(vecNorm);

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
    console.log("Done calculating occlusions!");
    console.log(
      `voxelsToOccludedRegions.size: ${this.voxelsToOccludedRegions.size}`
    );
  }

  // TODO: Why am I doing redundant raycasts?
  // Once I pepper a block, don't revisit it
  // TODO: Heuristic to do hierarchically increasingly granular when shooting at likely sky
  /**
   * Performs optimized raycasting with occlusion culling from bot's position
   * Starting from straight down, expanding outward
   */
  public *doRaycasting(fromVoxel: Vec3): Generator<[Vec3, PBlock | null]> {
    const temp = new Set<string>();
    let nRegionsSkipped = 0;
    let nRegionsProcessed = 0;
    console.log(
      `${
        this.sphereSpatialHash.data.npix *
        this.sphereSpatialHash.avgNumDirectionsPerRegion
      } orientations to raycast`
    );

    console.log(fromVoxel);
    if (
      !Number.isInteger(fromVoxel.x) ||
      !Number.isInteger(fromVoxel.y) ||
      !Number.isInteger(fromVoxel.z)
    ) {
      throw new Error("Only raycasting from a voxel (int coords) is supported");
    }
    const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
    const queue: number[] = [this.raycastStartRegion];
    const seenRegions = new Set<number>();
    const skipRaycastRegions = new Set<number>();
    const maxRaycastDistance = this.radius;

    while (queue.length > 0) {
      const currentRegion = queue.shift()!;
      seenRegions.add(currentRegion);

      // Add unseen neighboring regions to queue
      const neighboringRegions =
        this.sphereSpatialHash.getRegionNeighbors(currentRegion);
      const unprocessedNeighbors = neighboringRegions.filter(
        (region) => !seenRegions.has(region) && !queue.includes(region)
      );
      queue.push(...unprocessedNeighbors);

      // Perform raycasting for this region unless it's been marked as skippable
      if (skipRaycastRegions.has(currentRegion)) {
        nRegionsSkipped++;
        continue;
      }
      nRegionsProcessed++;

      const regionRayOrientations =
        this.sphereSpatialHash.getRegion(currentRegion);
      for (const vecNorm of regionRayOrientations) {
        if (temp.has(serializeVec3(vecNorm))) {
          continue; // Skip if we've already processed this orientation
        }
        temp.add(serializeVec3(vecNorm));

        const orientation = new ThreeDimOrientation(vecNorm);
        const hit: PBlock | null = this.bot.world.raycast(
          fromVoxelCenter,
          orientation.vecNorm,
          maxRaycastDistance
        );
        yield [orientation.vecNorm, hit];

        if (hit) {
          const hitBlockAtOffsetKey = serializeVec3(
            hit.position.minus(fromVoxel)
          ) as RelativeVoxelOffsetString;
          const regionsOccludedByHitBlock =
            this.voxelsToOccludedRegions.get(hitBlockAtOffsetKey);
          // If the above returned undefined, it's likely because the raycast hit something
          // just beyond the radius--which I assume to result from an allowed maxDistance
          // tolerance in Mineflayer's raycast implementation.
          if (regionsOccludedByHitBlock !== undefined) {
            const projectedRaycastSavings =
              regionsOccludedByHitBlock.filter(
                (region) =>
                  !skipRaycastRegions.has(region) && !seenRegions.has(region)
              ).length * this.sphereSpatialHash.avgNumDirectionsPerRegion;

            if (projectedRaycastSavings > 4) {
              // Mark occluded regions as completed to skip their full raycast
              for (const occludedRegion of regionsOccludedByHitBlock) {
                skipRaycastRegions.add(occludedRegion);
              }

              // Sparse raycast around the hit block's angular vicinity
              const occlusionRadius =
                this.voxelsToOcclusionRadii.get(hitBlockAtOffsetKey)!;
              for (const offsetOrientation of orientation.getCardinalOffsets(
                occlusionRadius
              )) {
                const hitAtOffset: PBlock | null = this.bot.world.raycast(
                  fromVoxelCenter,
                  offsetOrientation.vecNorm,
                  maxRaycastDistance
                );
                yield [offsetOrientation.vecNorm, hitAtOffset];
              }
            }
          }
        }
      }
    }
    console.log(`Skipped ${nRegionsSkipped} regions`);
    console.log(`Processed ${nRegionsProcessed} regions`);
    console.log(this.sphereSpatialHash.data.npix);
  }
}

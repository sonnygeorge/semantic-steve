import * as fs from "fs";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import {
  ThreeDimOrientation,
  OrientationString,
  PrecomputedRaycastData,
} from "./types";
import { serializeVec3 } from "../../../utils/generic";
import {
  AbsoluteWorldVoxelString,
  RelativeVoxelOffsetString,
} from "../../../types";
import { Block as PBlock } from "prismarine-block";
import { HEALPixSpatialHash } from "./healpix-hash";
import { asyncSleep } from "../../../utils/generic";

const RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS = 2000; // Yield control to the event loop every N raycasts

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
  public isRaycasting: boolean = false;
  // TODO: We don't need the below?
  private orientationsToSurfaceVoxelOffsets: Map<OrientationString, Vec3>;
  private sphereSpatialHash: HEALPixSpatialHash;
  private radius: number;
  private raycastStartRegion: number;
  // Raycast<->voxel penetrations data
  private voxelsToCastsThatPenetrateThem: Map<
    RelativeVoxelOffsetString, // Voxel offsets
    Set<OrientationString> // Penetrated by what raycasts orientations
  > = new Map();
  private orientationsToPentratedVoxels: Map<
    OrientationString, // Raycast orientation
    Set<RelativeVoxelOffsetString> // Voxels penetrated by this raycast
  > = new Map();
  // Precomputed occlusion data loaded from file
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

    const dataFPath = process.env
      .SEMANTIC_STEVE_PRECOMPUTED_RAYCAST_DATA_FPATH as string;
    if (!dataFPath) {
      throw new Error(
        "SEMANTIC_STEVE_PRECOMPUTED_RAYCAST_DATA_FPATH environment variable is not set."
      );
    }
    const rawData = fs.readFileSync(dataFPath, "utf8");
    const precomputedData: PrecomputedRaycastData = JSON.parse(rawData);

    this.sphereSpatialHash = new HEALPixSpatialHash(
      precomputedData.healpixData,
      [...this.orientations.values()].map((orientation) => orientation.vecNorm)
    );

    for (const [voxelKey, occlusionRadius] of Object.entries(
      precomputedData.voxelsToOcclusionRadii
    )) {
      this.voxelsToOcclusionRadii.set(
        voxelKey as RelativeVoxelOffsetString,
        occlusionRadius as number
      );
    }
    for (const [voxelKey, occludedRegions] of Object.entries(
      precomputedData.voxelsToOccludedRegions
    )) {
      this.voxelsToOccludedRegions.set(
        voxelKey as RelativeVoxelOffsetString,
        occludedRegions as number[]
      );
    }

    this.raycastStartRegion = this.sphereSpatialHash.getRegionOfDirection(
      new ThreeDimOrientation({ theta: 0, phi: Math.PI - 0.01 }).vecNorm
    ); // Straight down from the bot's pov

    this.calculateRaycastPenetrationData();
  }

  /**
   * Calculates and stores which voxels are penetrated by each raycast orientation
   * This method traces each ray direction and records all voxel offsets it passes through
   * Creates both forward and reverse mappings for efficient lookups
   */
  private calculateRaycastPenetrationData(): void {
    console.log("Calculating raycast penetration data...");

    this.voxelsToCastsThatPenetrateThem = new Map();
    this.orientationsToPentratedVoxels = new Map();

    const stepSize = 0.1; // Small increment for ray tracing
    const maxDistance = this.radius + 0.5; // Slightly beyond sphere radius to ensure coverage

    let processedRays = 0;
    const totalRays = this.orientations.size;

    for (const [orientationKey, orientation] of this.orientations.entries()) {
      const rayDirection = orientation.vecNorm;
      const penetratedVoxels = new Set<RelativeVoxelOffsetString>();

      // Initialize the reverse mapping for this orientation
      this.orientationsToPentratedVoxels.set(orientationKey, new Set());

      // Trace the ray from origin outward
      for (
        let distance = stepSize;
        distance <= maxDistance;
        distance += stepSize
      ) {
        // Calculate current position along the ray
        const currentPos = new Vec3(
          rayDirection.x * distance,
          rayDirection.y * distance,
          rayDirection.z * distance
        );

        // Get the voxel offset this position is in
        const voxelOffset = new Vec3(
          Math.floor(currentPos.x),
          Math.floor(currentPos.y),
          Math.floor(currentPos.z)
        );

        // Skip the origin voxel (0,0,0)
        if (voxelOffset.x === 0 && voxelOffset.y === 0 && voxelOffset.z === 0) {
          continue;
        }

        // Check if this voxel is within our sphere of interest
        const voxelDistance = Math.sqrt(
          voxelOffset.x * voxelOffset.x +
            voxelOffset.y * voxelOffset.y +
            voxelOffset.z * voxelOffset.z
        );

        if (voxelDistance > this.radius + 0.5) {
          break; // Beyond our sphere of interest
        }

        const voxelKey = serializeVec3(
          voxelOffset
        ) as RelativeVoxelOffsetString;

        // Only process each voxel once per ray
        if (!penetratedVoxels.has(voxelKey)) {
          penetratedVoxels.add(voxelKey);

          // Add this ray to the set of rays that penetrate this voxel
          if (!this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
            this.voxelsToCastsThatPenetrateThem.set(voxelKey, new Set());
          }
          this.voxelsToCastsThatPenetrateThem
            .get(voxelKey)!
            .add(orientationKey);

          // Add this voxel to the set of voxels penetrated by this ray
          this.orientationsToPentratedVoxels.get(orientationKey)!.add(voxelKey);
        }
      }

      processedRays++;
      if (processedRays % 1000 === 0) {
        console.log(`Processed ${processedRays}/${totalRays} rays`);
      }
    }

    console.log(`Raycast penetration data calculated:`);
    console.log(
      `- ${this.voxelsToCastsThatPenetrateThem.size} voxels have penetrating rays`
    );
    console.log(
      `- ${this.orientationsToPentratedVoxels.size} orientations mapped to penetrated voxels`
    );
  }

  // TODO: Why am I doing redundant raycasts?
  // ...Once I pepper a block, don't revisit it!
  // TODO: Heuristic to do hierarchically increasingly granular when shooting at likely sky
  /**
   * Performs optimized raycasting with occlusion culling from bot's position
   * Starting from straight down, expanding outward
   */
  public async *doRaycasting(
    fromVoxel: Vec3
  ): AsyncGenerator<[Vec3, PBlock | null]> {
    if (
      !Number.isInteger(fromVoxel.x) ||
      !Number.isInteger(fromVoxel.y) ||
      !Number.isInteger(fromVoxel.z)
    ) {
      throw new Error("Only raycasting from a voxel (int coords) is supported");
    }
    this.isRaycasting = true;
    let nRaycastsPerformed = 0;
    async function doAfterRaycast() {
      nRaycastsPerformed++;
      if (nRaycastsPerformed % RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS === 0) {
        await asyncSleep(0);
      }
    }
    // let nRegionsSkipped = 0;
    // let nRegionsProcessed = 0;
    const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
    const queue: number[] = [this.raycastStartRegion];
    const seenRegions = new Set<number>();

    // const skipRaycastRegions = new Set<number>();

    const castOrientationsToSkip = new Set<OrientationString>();
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

      // // Perform raycasting for this region unless it's been marked as skippable
      // if (skipRaycastRegions.has(currentRegion)) {
      //   nRegionsSkipped++;
      //   continue;
      // }
      // nRegionsProcessed++;

      const regionRayOrientations =
        this.sphereSpatialHash.getRegion(currentRegion);
      for (const vecNorm of regionRayOrientations) {
        // Perform raycast unless orientation has been marked as skippable
        const orientationKey = new ThreeDimOrientation(vecNorm).serialize();
        if (castOrientationsToSkip.has(orientationKey)) {
          continue;
        }

        const hit: PBlock | null = this.bot.world.raycast(
          fromVoxelCenter,
          vecNorm,
          maxRaycastDistance
        );
        yield [vecNorm, hit];
        await doAfterRaycast();

        if (hit) {
          const hitBlockAtOffsetKey = serializeVec3(
            hit.position.minus(fromVoxel)
          ) as RelativeVoxelOffsetString;

          const castOrientationsThatPenetrateHitBlock =
            this.voxelsToCastsThatPenetrateThem.get(hitBlockAtOffsetKey);
          // console.log(
          //   `Hit block at offset ${hitBlockAtOffsetKey} with ${castOrientationsThatPenetrateHitBlock?.size} penetrating orientations`
          // );
          if (
            castOrientationsThatPenetrateHitBlock &&
            castOrientationsThatPenetrateHitBlock.size - 1 > 4
          ) {
            // Add the orientations that penetrate the hit block to the skip list
            for (const orientationKey of castOrientationsThatPenetrateHitBlock) {
              castOrientationsToSkip.add(orientationKey);
            }

            // Sparse raycast around the hit block's angular vicinity
            const occlusionRadius =
              this.voxelsToOcclusionRadii.get(hitBlockAtOffsetKey)!;
            const orientationTowardsBlock = new ThreeDimOrientation({
              towards: hit.position.minus(fromVoxel),
            });
            for (const offsetOrientation of orientationTowardsBlock.getCardinalOffsets(
              occlusionRadius
            )) {
              const hitAtOffset: PBlock | null = this.bot.world.raycast(
                fromVoxelCenter,
                offsetOrientation.vecNorm,
                maxRaycastDistance
              );
              yield [offsetOrientation.vecNorm, hitAtOffset];
              await doAfterRaycast();
            }
          }
        }

        // if (hit) {
        //   const hitBlockAtOffsetKey = serializeVec3(
        //     hit.position.minus(fromVoxel)
        //   ) as RelativeVoxelOffsetString;
        //   const regionsOccludedByHitBlock =
        //     this.voxelsToOccludedRegions.get(hitBlockAtOffsetKey);
        //   // If the above returned undefined, it's likely because the raycast hit something
        //   // just beyond the radius--which I assume to result from an allowed maxDistance
        //   // tolerance in Mineflayer's raycast implementation.
        //   if (regionsOccludedByHitBlock !== undefined) {
        //     const projectedRaycastSavings =
        //       regionsOccludedByHitBlock.filter(
        //         (region) =>
        //           !skipRaycastRegions.has(region) && !seenRegions.has(region)
        //       ).length * this.sphereSpatialHash.avgNumDirectionsPerRegion;

        //     if (projectedRaycastSavings > 4) {
        //       // Mark occluded regions as completed to skip their full raycast
        //       for (const occludedRegion of regionsOccludedByHitBlock) {
        //         skipRaycastRegions.add(occludedRegion);
        //       }

        //       // Sparse raycast around the hit block's angular vicinity
        //       const occlusionRadius =
        //         this.voxelsToOcclusionRadii.get(hitBlockAtOffsetKey)!;
        //       for (const offsetOrientation of orientation.getCardinalOffsets(
        //         occlusionRadius
        //       )) {
        //         const hitAtOffset: PBlock | null = this.bot.world.raycast(
        //           fromVoxelCenter,
        //           offsetOrientation.vecNorm,
        //           maxRaycastDistance
        //         );
        //         yield [offsetOrientation.vecNorm, hitAtOffset];
        //         await doAfterRaycast();
        //       }
        //     }
        //   }
        // }
      }
    }
    // console.log(`Skipped ${nRegionsSkipped} regions`);
    // console.log(`Processed ${nRegionsProcessed} regions`);
    console.log(`Performed ${nRaycastsPerformed} raycasts`);
    this.isRaycasting = false;
  }
}

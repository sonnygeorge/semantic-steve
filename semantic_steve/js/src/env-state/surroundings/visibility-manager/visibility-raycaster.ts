import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import {
  ThreeDimOrientation,
  OrientationString,
  SphereSurfaceHashRegionString,
} from "./types";
import { SphereSurfaceHash } from "./sphere-surface-hash";
import { serializeVec3 } from "../../../utils/generic";
import { RelativeVoxelOffsetString } from "../../../types";
import { Block as PBlock } from "prismarine-block";

// Region key for straight down direction (theta=0, phi=π mapped to grid indices)
const STRAIGHT_DOWN_REGION = "0,0" as SphereSurfaceHashRegionString;

export class VisibilityRaycaster {
  private bot: Bot;
  private sphereSurfaceHash: SphereSurfaceHash;
  private radiusOfInterest: number;

  constructor(bot: Bot, radiusOfInterest: number) {
    if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
      throw new Error("radiusOfInterest must be a positive integer");
    }
    this.bot = bot;
    this.radiusOfInterest = radiusOfInterest;
    this.sphereSurfaceHash = new SphereSurfaceHash(radiusOfInterest);
  }

  /**
   * Performs optimized raycasting with occlusion culling from bot's position
   * Starting from straight down, expanding outward
   */
  public *doRaycasting(
    botPosition: Vec3
  ): Generator<[OrientationString, PBlock | null]> {
    const botVoxel = botPosition.floor();
    const botVoxelCenter = botVoxel.offset(0.5, 0.5, 0.5);

    const queue: SphereSurfaceHashRegionString[] = [STRAIGHT_DOWN_REGION];
    const completedSurfaceRegions = new Set<SphereSurfaceHashRegionString>();
    const regionsToMaxRaycastDistances = new Map<
      SphereSurfaceHashRegionString,
      number
    >();

    while (queue.length > 0) {
      const currentRegion = queue.shift()!;

      if (completedSurfaceRegions.has(currentRegion)) {
        continue;
      }

      const regionRayOrientations = this.sphereSurfaceHash.get(currentRegion);

      for (const orientationKey of regionRayOrientations) {
        const maxDistance =
          regionsToMaxRaycastDistances.get(currentRegion) ||
          this.radiusOfInterest;
        const orientation = ThreeDimOrientation.deserialize(orientationKey);
        const hit: PBlock | null = this.bot.world.raycast(
          botVoxelCenter,
          orientation.vecNorm,
          maxDistance
        );
        yield [orientationKey, hit];

        if (hit) {
          const hitBlockAtOffsetKey = serializeVec3(
            hit.position
          ) as RelativeVoxelOffsetString;
          const regionsOccludedByHitBlock =
            this.sphereSurfaceHash.voxelsToOccludedRegions.get(
              hitBlockAtOffsetKey
            )!;

          const projectedRaycastSavings =
            regionsOccludedByHitBlock.length *
            this.sphereSurfaceHash.avgNumOrientationsPerRegion;

          if (projectedRaycastSavings > 4) {
            // Mark occluded regions as completed to skip their full raycast
            for (const occludedRegion of regionsOccludedByHitBlock) {
              completedSurfaceRegions.add(occludedRegion);
            }

            // Sparse raycast around the hit block's angular vicinity
            const occlusionRadius =
              this.sphereSurfaceHash.voxelsToOcclusionRadii.get(
                hitBlockAtOffsetKey
              )!;
            const baseOrientation =
              ThreeDimOrientation.deserialize(orientationKey);
            const baseAngles = baseOrientation.sphericalAngles;
            const angularOffsets = [
              { theta: occlusionRadius, phi: 0 },
              { theta: -occlusionRadius, phi: 0 },
              { theta: 0, phi: occlusionRadius },
              { theta: 0, phi: -occlusionRadius },
            ];

            for (const angularOffset of angularOffsets) {
              const offsetAngles = {
                theta: baseAngles.theta + angularOffset.theta,
                phi: baseAngles.phi + angularOffset.phi,
              };

              // Normalize theta to [0, 2π) and clamp phi to [0, π]
              let normalizedTheta = offsetAngles.theta;
              if (normalizedTheta < 0) normalizedTheta += 2 * Math.PI;
              if (normalizedTheta >= 2 * Math.PI)
                normalizedTheta -= 2 * Math.PI;

              const clampedPhi = Math.max(
                0,
                Math.min(Math.PI, offsetAngles.phi)
              );

              const offsetOrientation = new ThreeDimOrientation({
                theta: normalizedTheta,
                phi: clampedPhi,
              });
              const offsetOrientationKey = offsetOrientation.serialize();
              // const expectedMaxRaycastDistance = hit.distance + 1.732; // sqrt(3) for voxel diagonal
              const hitAtOffset: PBlock | null = this.bot.world.raycast(
                botVoxelCenter,
                offsetOrientation.vecNorm,
                this.radiusOfInterest // expectedMaxRaycastDistance
              );

              // if (
              //   hitAtOffset &&
              //   hitAtOffset.distance > expectedMaxRaycastDistance
              // ) {
              //   throw new Error(
              //     `Occlusion calculation error: ray exceeded expected distance`
              //   );
              // }

              yield [offsetOrientationKey, hitAtOffset];
            }
          }
        }
      }

      completedSurfaceRegions.add(currentRegion);

      // Add neighboring regions to queue
      const neighboringRegions =
        this.sphereSurfaceHash.getNeighboringRegions(currentRegion);
      const unprocessedNeighbors = neighboringRegions.filter(
        (region) =>
          !completedSurfaceRegions.has(region as SphereSurfaceHashRegionString)
      );
      queue.push(...(unprocessedNeighbors as SphereSurfaceHashRegionString[]));
    }
  }
}

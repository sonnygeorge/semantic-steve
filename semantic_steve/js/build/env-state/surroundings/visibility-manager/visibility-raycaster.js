"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityRaycaster = void 0;
const types_1 = require("./types");
const sphere_surface_hash_1 = require("./sphere-surface-hash");
const generic_1 = require("../../../utils/generic");
// Region key for straight down direction (theta=0, phi=π mapped to grid indices)
const STRAIGHT_DOWN_REGION = "0,0";
class VisibilityRaycaster {
    constructor(bot, radiusOfInterest) {
        if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
            throw new Error("radiusOfInterest must be a positive integer");
        }
        this.bot = bot;
        this.radiusOfInterest = radiusOfInterest;
        this.sphereSurfaceHash = new sphere_surface_hash_1.SphereSurfaceHash(radiusOfInterest);
    }
    /**
     * Performs optimized raycasting with occlusion culling from bot's position
     * Starting from straight down, expanding outward
     */
    *doRaycasting(botPosition) {
        const botVoxel = botPosition.floor();
        const botVoxelCenter = botVoxel.offset(0.5, 0.5, 0.5);
        const queue = [STRAIGHT_DOWN_REGION];
        const completedSurfaceRegions = new Set();
        const regionsToMaxRaycastDistances = new Map();
        while (queue.length > 0) {
            const currentRegion = queue.shift();
            if (completedSurfaceRegions.has(currentRegion)) {
                continue;
            }
            const regionRayOrientations = this.sphereSurfaceHash.get(currentRegion);
            for (const orientationKey of regionRayOrientations) {
                const maxDistance = regionsToMaxRaycastDistances.get(currentRegion) ||
                    this.radiusOfInterest;
                const orientation = types_1.ThreeDimOrientation.deserialize(orientationKey);
                const hit = this.bot.world.raycast(botVoxelCenter, orientation.vecNorm, maxDistance);
                yield [orientationKey, hit];
                if (hit) {
                    const hitBlockAtOffsetKey = (0, generic_1.serializeVec3)(hit.position);
                    const regionsOccludedByHitBlock = this.sphereSurfaceHash.voxelsToOccludedRegions.get(hitBlockAtOffsetKey);
                    const projectedRaycastSavings = regionsOccludedByHitBlock.length *
                        this.sphereSurfaceHash.avgNumOrientationsPerRegion;
                    if (projectedRaycastSavings > 4) {
                        // Mark occluded regions as completed to skip their full raycast
                        for (const occludedRegion of regionsOccludedByHitBlock) {
                            completedSurfaceRegions.add(occludedRegion);
                        }
                        // Sparse raycast around the hit block's angular vicinity
                        const occlusionRadius = this.sphereSurfaceHash.voxelsToOcclusionRadii.get(hitBlockAtOffsetKey);
                        const baseOrientation = types_1.ThreeDimOrientation.deserialize(orientationKey);
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
                            if (normalizedTheta < 0)
                                normalizedTheta += 2 * Math.PI;
                            if (normalizedTheta >= 2 * Math.PI)
                                normalizedTheta -= 2 * Math.PI;
                            const clampedPhi = Math.max(0, Math.min(Math.PI, offsetAngles.phi));
                            const offsetOrientation = new types_1.ThreeDimOrientation({
                                theta: normalizedTheta,
                                phi: clampedPhi,
                            });
                            const offsetOrientationKey = offsetOrientation.serialize();
                            // const expectedMaxRaycastDistance = hit.distance + 1.732; // sqrt(3) for voxel diagonal
                            const hitAtOffset = this.bot.world.raycast(botVoxelCenter, offsetOrientation.vecNorm, this.radiusOfInterest // expectedMaxRaycastDistance
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
            const neighboringRegions = this.sphereSurfaceHash.getNeighboringRegions(currentRegion);
            const unprocessedNeighbors = neighboringRegions.filter((region) => !completedSurfaceRegions.has(region));
            queue.push(...unprocessedNeighbors);
        }
    }
}
exports.VisibilityRaycaster = VisibilityRaycaster;

import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { ThreeDimOrientation, OrientationString } from "./types";
import { serializeVec3 } from "../../../utils/generic";
import { RelativeVoxelOffsetString } from "../../../types";
import { Block as PBlock } from "prismarine-block";
import { asyncSleep } from "../../../utils/generic";

const RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS = 2000;

function getOrientations(
  sphereRadius: number
): Map<OrientationString, ThreeDimOrientation> {
  if (!Number.isInteger(sphereRadius) || sphereRadius <= 0) {
    throw new Error("sphereRadius must be a positive integer");
  }

  const orientations: Map<OrientationString, ThreeDimOrientation> = new Map();
  const visited = new Set<RelativeVoxelOffsetString>();

  const processXYZ = (x: number, y: number, z: number) => {
    // Skip zero vector to avoid degenerate cases
    if (x === 0 && y === 0 && z === 0) return;
    const voxelOffset: Vec3 = new Vec3(x, y, z);
    const voxelOffsetString = serializeVec3(voxelOffset);
    const distanceToVoxel = Math.sqrt(x * x + y * y + z * z);
    if (Math.abs(distanceToVoxel - sphereRadius) <= 0.5) {
      const orientation = new ThreeDimOrientation({ towards: voxelOffset });
      if (!visited.has(voxelOffsetString)) {
        const key = orientation.serialize();
        orientations.set(key, orientation);
        visited.add(voxelOffsetString);
      }
    }
  };

  for (let y = -sphereRadius; y <= 0; y++) {
    for (let x = -sphereRadius; x <= sphereRadius; x++) {
      for (let z = -sphereRadius; z <= sphereRadius; z++) {
        processXYZ(x, y, z);
      }
    }
  }
  for (let y = sphereRadius; y >= 0; y--) {
    for (let x = -sphereRadius; x <= sphereRadius; x++) {
      for (let z = -sphereRadius; z <= sphereRadius; z++) {
        processXYZ(x, y, z);
      }
    }
  }
  return orientations;
}

export class VisibilityRaycaster {
  private bot: Bot;
  private radius: number; // Radius of the sphere of interest
  private orientations: Map<OrientationString, ThreeDimOrientation>;
  public isRaycasting: boolean = false;
  // Raycast<->voxel penetrations mappings
  private voxelsToCastsThatPenetrateThem: Map<
    RelativeVoxelOffsetString, // Voxel offsets
    Set<OrientationString> // Penetrated by what raycasts orientations
  > = new Map();
  private orientationsToPentratedVoxels: Map<
    OrientationString, // Raycast orientation
    Set<RelativeVoxelOffsetString> // Voxels penetrated by this raycast
  > = new Map();

  constructor(bot: Bot, radiusOfInterest: number) {
    if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
      throw new Error("radiusOfInterest must be a positive integer");
    }
    this.bot = bot;
    this.radius = radiusOfInterest;

    this.orientations = getOrientations(this.radius);

    this.calculateRaycastPenetrationData();
  }

  /**
   * Traces a ray through voxels using 3D DDA algorithm
   * @param origin - Starting point of the ray (typically 0.5, 0.5, 0.5 for voxel center)
   * @param direction - Normalized direction vector
   * @param maxDistance - Maximum distance to trace
   * @returns Set of voxel offsets the ray passes through
   */
  private traceRayThroughVoxels(
    origin: Vec3,
    direction: Vec3,
    maxDistance: number
  ): Set<RelativeVoxelOffsetString> {
    const penetratedVoxels = new Set<RelativeVoxelOffsetString>();

    // Current voxel position
    let currentVoxel = new Vec3(
      Math.floor(origin.x),
      Math.floor(origin.y),
      Math.floor(origin.z)
    );

    // Calculate step direction for each axis (-1, 0, or 1)
    const step = new Vec3(
      direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0,
      direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0,
      direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0
    );

    // Calculate the position of the next voxel boundary for each axis
    const nextBoundary = new Vec3(
      direction.x > 0 ? Math.floor(origin.x) + 1 : Math.floor(origin.x),
      direction.y > 0 ? Math.floor(origin.y) + 1 : Math.floor(origin.y),
      direction.z > 0 ? Math.floor(origin.z) + 1 : Math.floor(origin.z)
    );

    // Calculate tMax: the distance along the ray to the next voxel boundary for each axis
    const tMax = new Vec3(
      direction.x !== 0 ? (nextBoundary.x - origin.x) / direction.x : Infinity,
      direction.y !== 0 ? (nextBoundary.y - origin.y) / direction.y : Infinity,
      direction.z !== 0 ? (nextBoundary.z - origin.z) / direction.z : Infinity
    );

    // Calculate tDelta: how far along the ray we must move to cross one voxel boundary
    const tDelta = new Vec3(
      direction.x !== 0 ? Math.abs(1.0 / direction.x) : Infinity,
      direction.y !== 0 ? Math.abs(1.0 / direction.y) : Infinity,
      direction.z !== 0 ? Math.abs(1.0 / direction.z) : Infinity
    );

    // Track total distance traveled
    let distanceTraveled = 0;

    // Add the starting voxel if it's not the origin
    if (currentVoxel.x !== 0 || currentVoxel.y !== 0 || currentVoxel.z !== 0) {
      const voxelKey = serializeVec3(currentVoxel) as RelativeVoxelOffsetString;
      penetratedVoxels.add(voxelKey);
    }

    // Traverse voxels
    while (distanceTraveled < maxDistance) {
      // Find the axis with the smallest tMax (next boundary crossing)
      let minAxis: "x" | "y" | "z";
      if (tMax.x < tMax.y && tMax.x < tMax.z) {
        minAxis = "x";
      } else if (tMax.y < tMax.z) {
        minAxis = "y";
      } else {
        minAxis = "z";
      }

      // Update distance traveled
      distanceTraveled = tMax[minAxis];

      // Check if we've exceeded our maximum distance
      if (distanceTraveled > maxDistance) {
        break;
      }

      // Move to the next voxel
      currentVoxel[minAxis] += step[minAxis];

      // Update tMax for the axis we just crossed
      tMax[minAxis] += tDelta[minAxis];

      // Check if the new voxel is within our sphere of interest
      const voxelDistance = Math.sqrt(
        currentVoxel.x * currentVoxel.x +
          currentVoxel.y * currentVoxel.y +
          currentVoxel.z * currentVoxel.z
      );

      if (voxelDistance > this.radius + 0.5) {
        break; // Beyond our sphere of interest
      }

      // Skip the origin voxel
      if (
        currentVoxel.x === 0 &&
        currentVoxel.y === 0 &&
        currentVoxel.z === 0
      ) {
        continue;
      }

      // Add this voxel to our set
      const voxelKey = serializeVec3(currentVoxel) as RelativeVoxelOffsetString;
      penetratedVoxels.add(voxelKey);
    }

    return penetratedVoxels;
  }

  /**
   * Calculates and stores which voxels are penetrated by each raycast orientation
   * Uses 3D DDA algorithm to ensure all voxels are visited
   */
  private calculateRaycastPenetrationData(): void {
    this.voxelsToCastsThatPenetrateThem = new Map();
    this.orientationsToPentratedVoxels = new Map();

    const maxDistance = this.radius + 0.5; // Slightly beyond sphere radius
    const rayOrigin = new Vec3(0.5, 0.5, 0.5); // Center of the origin voxel

    for (const [orientationKey, orientation] of this.orientations.entries()) {
      const rayDirection = orientation.vecNorm;

      // Use DDA to trace the ray through voxels
      const penetratedVoxels = this.traceRayThroughVoxels(
        rayOrigin,
        rayDirection,
        maxDistance
      );

      // Store the forward mapping (orientation -> voxels)
      this.orientationsToPentratedVoxels.set(orientationKey, penetratedVoxels);

      // Store the reverse mapping (voxel -> orientations)
      for (const voxelKey of penetratedVoxels) {
        if (!this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
          this.voxelsToCastsThatPenetrateThem.set(voxelKey, new Set());
        }
        this.voxelsToCastsThatPenetrateThem.get(voxelKey)!.add(orientationKey);
      }
    }
  }

  /**
   * Performs raycasting with occlusion culling from a given voxel position.
   * @param fromVoxel - The voxel position to start raycasting from.
   * @returns An async generator yielding pairs of [direction, hitBlock] where
   *          `direction` is the direction vector of the raycast and `hitBlock`
   *          is the block hit by the raycast, or null if no block was hit.
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

    const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
    const orientationsToSkip = new Set<OrientationString>();
    const maxRaycastDistance = this.radius + 0.5; // Slightly beyond sphere radius to ensure coverage

    let nRaycastsPerformed = 0;
    async function releaseEventLoopIfNecessary() {
      nRaycastsPerformed++;
      if (nRaycastsPerformed % RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS === 0) {
        await asyncSleep(0);
      }
    }

    for (const [originalRayOrientationKey, OriginalRayOrientation] of this
      .orientations) {
      if (orientationsToSkip.has(originalRayOrientationKey)) {
        continue;
      }
      const hit: PBlock | null = this.bot.world.raycast(
        fromVoxelCenter,
        OriginalRayOrientation.vecNorm,
        maxRaycastDistance
      );
      yield [OriginalRayOrientation.vecNorm, hit];
      await releaseEventLoopIfNecessary();

      if (hit) {
        const hitBlockAtOffsetKey = serializeVec3(
          hit.position.minus(fromVoxel)
        ) as RelativeVoxelOffsetString;

        const castOrientationsThatPenetrateHitBlock =
          this.voxelsToCastsThatPenetrateThem.get(hitBlockAtOffsetKey);

        if (
          castOrientationsThatPenetrateHitBlock &&
          castOrientationsThatPenetrateHitBlock.size - 1 > 4
        ) {
          // Pepper around the block (4 raycasts-up down, left, and right of center orientation)
          const occlusionRadius = Math.atan(
            0.495 / hit.position.distanceTo(fromVoxel)
          );
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
            await releaseEventLoopIfNecessary();
          }

          // In the future, skip the orientations that penetrate the hit block
          for (const penetratorOrientationKey of castOrientationsThatPenetrateHitBlock) {
            orientationsToSkip.add(penetratorOrientationKey);
          }
        }
      }
    }
    this.isRaycasting = false;
  }
}

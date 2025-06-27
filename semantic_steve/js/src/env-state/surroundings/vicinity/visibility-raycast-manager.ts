import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import {
  ThreeDimensionalOrientation,
  generateUniformlyDistributed3DOrientations,
  serializeVec3,
} from "../../../utils/generic";
import { getCurEyePos, getVoxelOfPosition } from "../../../utils/misc";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";
import { assertMinimumRaycastDensity } from "./asserts";

function getVoxelPenetrationsOfRaycast(
  direction: Vec3,
  maxDistance: number,
  step: number = 0.1 // Adjust based on voxel size for accuracy vs performance
): Vec3[] {
  const voxels: Vec3[] = [];
  const alreadyAdded: Set<string> = new Set();
  for (let distance = 0; distance <= maxDistance; distance += step) {
    const point = direction.scaled(distance);
    const voxel = getVoxelOfPosition(point);
    if (!alreadyAdded.has(serializeVec3(voxel))) {
      voxels.push(voxel);
      alreadyAdded.add(serializeVec3(voxel));
    }
  }
  return voxels;
}

/**
 * Manages visibility raycasts for observing the bot's surroundings.
 *
 * Design philosophy:
 * - We manage only a limited number of raycasts that are evenly distributed
 *   over the possible directions from the bot's eyes (e.g., like lidar).
 * - We store hit data in structures that enable efficient access of the data.
 */
export class VisibilityRaycastManager {
  private bot: Bot;
  private radiusOfInterest: number;

  // ==========================================================================
  // Utility mappings calculated on initialization from the radius of interest
  // ==========================================================================

  // Cast orientations by key
  public readonly raycasts: Map<string, ThreeDimensionalOrientation>;
  // What raycast orientations penetrate what voxels
  public raycastsToVoxelPenetrations: Map<string, Vec3[]>;
  public voxelsToCastsThatPenetrateThem: Map<
    string,
    string[] // (keys of cast orientations)
  >;

  // ========================================================
  // The continually updated data structures of raycast hits
  // ========================================================

  // Mapping raycast orientations to lidar hits (Vec3 positions)
  public readonly raycastsToHits: Map<string, Vec3 | null>;
  // The hits within respective voxels
  public readonly hitsOrganizedIntoVoxelSpace: VoxelSpaceAroundBotEyes<Vec3[]>;
  // Voxel space of booleans indicating whether a contains at least one hit
  public readonly visibilityMask: VoxelSpaceAroundBotEyes<boolean>;

  constructor(
    bot: Bot,
    radiusOfInterest: number,
    numRaycastOrientations: number = 130000
  ) {
    assertMinimumRaycastDensity(radiusOfInterest, numRaycastOrientations);
    this.bot = bot;
    this.radiusOfInterest = radiusOfInterest;

    // -------------------------------------------
    // Precalculate certain maps for quick lookup
    // -------------------------------------------

    // Calculate the raycasts orientations
    this.raycasts = new Map(
      [
        ...generateUniformlyDistributed3DOrientations(numRaycastOrientations),
      ].map((orientation) => [orientation.serialize(), orientation])
    );
    // Calculate the voxel penetrations for the casts
    this.raycastsToVoxelPenetrations = new Map();
    this.voxelsToCastsThatPenetrateThem = new Map();
    for (const [raycastKey, orientation] of this.raycasts) {
      // Get the voxels penetrated by raycasting until radius in this direction
      const penetratedVoxels = getVoxelPenetrationsOfRaycast(
        orientation.directionVector,
        radiusOfInterest
      );
      // Store this info in maps for quick lookup later
      this.raycastsToVoxelPenetrations.set(raycastKey, penetratedVoxels);
      for (const voxel of penetratedVoxels) {
        const voxelKey = serializeVec3(voxel);
        if (!this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
          this.voxelsToCastsThatPenetrateThem.set(voxelKey, []);
        }
        this.voxelsToCastsThatPenetrateThem.get(voxelKey)!.push(raycastKey);
      }
    }

    // ---------------------------------------------------
    // Initialize the continually updated data structures
    // ---------------------------------------------------

    this.raycastsToHits = new Map();
    this.hitsOrganizedIntoVoxelSpace = new VoxelSpaceAroundBotEyes<Vec3[]>(
      bot,
      radiusOfInterest,
      () => [] // Default factory to initialize empty arrays for hits arrays
    );
    this.visibilityMask = new VoxelSpaceAroundBotEyes<boolean>(
      bot,
      radiusOfInterest,
      false
    );
  }

  private getRaycastsAroundVoxel(
    forWorldVoxel: Vec3,
    numSurroundingVoxelsRadius: number | undefined = 1
  ): Set<string> {
    const radius = Math.ceil(numSurroundingVoxelsRadius ?? 1);
    const raycasts = new Set<string>();
    // Iterate over a cube centered on forWorldVoxel
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const voxel = forWorldVoxel.offset(x, y, z);
          const voxelKey = serializeVec3(voxel);
          // Add all raycasts that penetrate this voxel
          if (this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
            for (const raycastKey of this.voxelsToCastsThatPenetrateThem.get(
              voxelKey
            )!) {
              raycasts.add(raycastKey);
            }
          }
        }
      }
    } // NOTE: This is a cubic search, not spherical, for simplicity
    return raycasts;
  }

  private updateRaycast(raycastKey: string): void {
    const orientation = this.raycasts.get(raycastKey);
    assert(orientation);

    // Remove previous hit data
    const previousHit = this.raycastsToHits.get(raycastKey) || null;
    if (previousHit) {
      // Remove the hit from the raycastsToHits map
      this.raycastsToHits.set(raycastKey, null);
      // Remove the hit from voxel-associated array in hitsOrganizedIntoVoxelSpace
      const arrayOfHitsForVoxel =
        this.hitsOrganizedIntoVoxelSpace.getFromWorldPosition(previousHit);
      const arrayOfHitsForVoxelIndex = arrayOfHitsForVoxel.indexOf(previousHit);
      assert(arrayOfHitsForVoxelIndex !== -1);
      arrayOfHitsForVoxel.splice(arrayOfHitsForVoxelIndex, 1);
      // If that array is now empty, unset the voxel in the mask
      if (arrayOfHitsForVoxel.length === 0) {
        this.visibilityMask.unsetFromWorldPosition(previousHit);
      }
    }

    // Raycast from the bot's eye position in the direction of the orientation
    const hit = this.bot.world.raycast(
      getCurEyePos(this.bot),
      orientation.directionVector,
      this.radiusOfInterest
    );

    if (hit) {
      // Add the hit to the raycastsToHits map
      this.raycastsToHits.set(raycastKey, hit.intersection);
      // Add the hit to the voxel space organized hits
      const arrayOfHitsForVoxel =
        this.hitsOrganizedIntoVoxelSpace.getFromWorldPosition(hit.intersection);
      arrayOfHitsForVoxel.push(hit.intersection);
      // Set the voxel in the mask to true if it wasn't already
      this.visibilityMask.setFromWorldPosition(hit.intersection, true);
    }
  }

  public updateRaycasts(
    strategy:
      | "everywhere"
      | {
          forWorldVoxel: Vec3;
          numSuroundingVoxelsRadius?: number | undefined;
        } = "everywhere"
  ): void {
    if (strategy === "everywhere") {
      for (const raycastKey of this.raycasts.keys()) {
        this.updateRaycast(raycastKey);
      }
    } else {
      for (const raycastKey of this.getRaycastsAroundVoxel(
        strategy.forWorldVoxel,
        strategy.numSuroundingVoxelsRadius
      )) {
        this.updateRaycast(raycastKey);
      }
    }
  }
}

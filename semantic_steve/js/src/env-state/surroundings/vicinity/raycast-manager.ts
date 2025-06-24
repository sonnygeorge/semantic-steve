import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { VicinityName } from "./enums";
import { VoxelSpaceArray } from "./common";

class Orientation {
  horizontalAngle: number; // radians
  verticalAngle: number; // radians

  constructor(
    params:
      | { horizontalAngle: number; verticalAngle: number }
      | { towards: { x: number; y: number; z: number } }
  ) {
    if ("horizontalAngle" in params && "verticalAngle" in params) {
      this.horizontalAngle = params.horizontalAngle;
      this.verticalAngle = params.verticalAngle;
    } else {
      const { x, y, z } = params.towards;
      this.horizontalAngle = Math.atan2(x, z);
      const horizontalDistance = Math.sqrt(x * x + z * z);
      this.verticalAngle = Math.atan2(y, horizontalDistance);
    }
  }

  public serialize(): string {
    return `${this.horizontalAngle.toFixed(4)},${this.verticalAngle.toFixed(
      4
    )}`;
  }
}

class SphericalRaycastSector {
  axis: Orientation;
  aperture: number;

  constructor(axis: Orientation, aperture: number) {
    this.axis = axis;
    if (aperture < 0 && aperture > Math.PI) {
      const msg = `Aperture must be between 0 and π radians. Got: ${aperture}`;
      throw new Error(msg);
    }
    this.aperture = aperture;
  }
}

const N_RAYCAST_ANGLES = 3000; // TODO: Move to config

export class VisibilityRaycastManager {
  private bot: Bot;

  // ==============================================
  // Static properties computed once params/config
  // ==============================================
  // What cast orientations penetrate what voxels
  public static readonly castOrientationPenetrations: VoxelSpaceArray<Orientation[]>;
  // Graph of casts and their neighbors
  public static readonly castOrientations: {
    string: { cast: Orientation; neighbors: string[] };
  };

  // =====================================================
  // The constantly updated data structures of lidar hits
  // =====================================================
  // Mapping cast orientations to lidar hits (Vec3 positions)
  public readonly castOrientationsToHits: { string: Vec3[] };
  // The hits within respective voxels
  public readonly hitsOrganizedByVoxels: VoxelSpaceArray<Vec3[]>;
  // Booleans indicating whether the voxel contains at least on hit
  public readonly hitVoxels: VoxelSpaceArray<boolean>;

  constructor(bot: Bot: radiusOfInterest: number) {
    this.bot = bot;
    // TODO: assert N_RAYCAST_ANGLES > 4πr^2 (surface area of sphere of interest)
    //   intuition = we need at least one raycast per outer voxel to not need interpolation
    // TODO: implement
  }

  public castBeamsAndUpdate(
    strategy: "everywhere" | SphericalRaycastSector
  ): void {
    // TODO: implement
  }
}

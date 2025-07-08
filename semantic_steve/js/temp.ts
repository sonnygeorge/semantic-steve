import { writeFileSync } from "fs";
import { Vec3 } from "vec3";
import { ThreeDimOrientation } from "./src/env-state/surroundings/visibility-manager/types";

type OrientationString = string;
type RelativeVoxelOffsetString = string;

// Assume serializeVec3 is provided; define it here for completeness
function serializeVec3(vec: Vec3): RelativeVoxelOffsetString {
  return `${vec.x},${vec.y},${vec.z}`;
}

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

// Main function to generate orientations.json
function generateOrientationsJson(sphereRadius: number): void {
  // Get orientations map
  const [, orientationsMap] =
    getMapOfOrientationsToSphereSurfaceVoxelOffsets(sphereRadius);

  // Convert orientations to [phi, theta] arrays
  const orientationsArray: [number, number][] = Array.from(
    orientationsMap.entries()
  )
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by key for deterministic output
    .map(([_, orientation]) => {
      const { phi, theta } = orientation.sphericalAngles;
      return [phi, theta];
    });

  // Write to orientations.json
  const outputPath = "orientations.json";
  writeFileSync(
    outputPath,
    JSON.stringify(orientationsArray, null, 2),
    "utf-8"
  );
  console.log(
    `Successfully wrote ${orientationsArray.length} orientations to ${outputPath}`
  );
}

// Run with a sample sphere radius
const SPHERE_RADIUS = 30;
generateOrientationsJson(SPHERE_RADIUS);

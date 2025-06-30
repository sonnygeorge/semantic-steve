// In typescript, I want to get all all voxels of the voxel-surface of a hollow voxelized sphere. Specifically, I want to get a mapping of angles (horizontal component, vertical component --serialized to string), to the centroids of each voxel (center coordinates of the cube) that makes up the surface of this sphere. The origin (0,0, 0) of the coordinate system is the center of the sphere and the center of the centermost voxel. This way, the centers of all other voxels are always have integer x, y, & z components. Furthermore, I want to also somehow organize the created data structure(s) in a way that each angle/surface voxel pair also have links to they key of the 4 neighboring angle/surface voxel pairs (in both the positive & negative horizontal angle and the positive & negative vertical angle). This should all be parameterized by an integer radius for the size of the sphere.

// Here's some skeleton to get you started:
// ```
// interface Voxel {
//   x: number; // Integer
//   y: number; // Integer
//   z: number; // Integer
// }

// function serializeVoxel(voxel: Voxel): string {
//   return `${voxel.x},${voxel.y},${voxel.z}`;
// }

// interface Angle {
//   theta: number; // Horizontal angle in radians
//   phi: number; // Vertical angle in radians
// }

// function serializeAngle(angle: Angle): string {
//   return `${angle.theta},${angle.phi}`;
// }

// interface VoxelNode {
//   centroid: Voxel;
//   angleKey: string;
//   neighbors: {
//     posTheta?: string;
//     negTheta?: string;
//     posPhi?: string;
//     negPhi?: string;
//   };
// }

// type MapOfAnglesToSphereSurfaceVoxels = Map<string, VoxelNode>;

// function getMapOfAnglesToSphereSurfaceVoxels(
//   sphereRadius: number // Integer
// ): MapOfAnglesToSphereSurfaceVoxels {
//   // TODO
// }

// ```

interface Voxel {
  x: number; // Integer
  y: number; // Integer
  z: number; // Integer
}

function serializeVoxel(voxel: Voxel): string {
  return `${voxel.x},${voxel.y},${voxel.z}`;
}

interface Angle {
  theta: number; // Horizontal angle in radians
  phi: number; // Vertical angle in radians
}

function serializeAngle(angle: Angle): string {
  return `${angle.theta},${angle.phi}`;
}

interface VoxelNode {
  centroid: Voxel;
  angleKey: string;
  neighbors: {
    posTheta?: string;
    negTheta?: string;
    posPhi?: string;
    negPhi?: string;
  };
}

type MapOfAnglesToSphereSurfaceVoxels = Map<string, VoxelNode>;

// Helper function to round angles to a specific precision to avoid floating-point issues
function roundAngle(value: number, precision: number = 6): number {
  return Number(value.toFixed(precision));
}

// Convert Cartesian coordinates to spherical coordinates
function cartesianToSpherical(voxel: Voxel): Angle {
  const { x, y, z } = voxel;
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = Math.atan2(y, x); // Horizontal angle
  const phi = Math.acos(z / r); // Vertical angle
  return {
    theta: roundAngle(theta),
    phi: roundAngle(phi),
  };
}

// Check if a voxel is on the surface of the sphere
function isSurfaceVoxel(voxel: Voxel, radius: number): boolean {
  const { x, y, z } = voxel;
  const distance = Math.sqrt(x * x + y * y + z * z);
  // A voxel is on the surface if its centroid is within the sphere's radius bounds
  // We consider a voxel on the surface if its distance is between radius-0.5 and radius+0.5
  return Math.abs(distance - radius) <= 0.5;
}

function getMapOfAnglesToSphereSurfaceVoxels(
  sphereRadius: number // Integer
): MapOfAnglesToSphereSurfaceVoxels {
  if (!Number.isInteger(sphereRadius) || sphereRadius <= 0) {
    throw new Error("sphereRadius must be a positive integer");
  }

  const result: MapOfAnglesToSphereSurfaceVoxels = new Map();
  const visited = new Set<string>();
  const angleToVoxelMap = new Map<string, Voxel>();

  // Iterate over a cubic region around the origin
  const range = Math.ceil(sphereRadius + 1);
  for (let x = -range; x <= range; x++) {
    for (let y = -range; y <= range; y++) {
      for (let z = -range; z <= range; z++) {
        const voxel: Voxel = { x, y, z };
        if (isSurfaceVoxel(voxel, sphereRadius)) {
          const angle = cartesianToSpherical(voxel);
          const angleKey = serializeAngle(angle);
          const voxelKey = serializeVoxel(voxel);

          if (!visited.has(voxelKey)) {
            visited.add(voxelKey);
            angleToVoxelMap.set(angleKey, voxel);

            const node: VoxelNode = {
              centroid: voxel,
              angleKey,
              neighbors: {},
            };
            result.set(angleKey, node);
          }
        }
      }
    }
  }

  // Assign neighbors based on angular proximity
  const angleKeys = Array.from(result.keys());
  for (const angleKey of angleKeys) {
    const node = result.get(angleKey)!;
    const angle = cartesianToSpherical(node.centroid); // Fix: Compute angles from centroid
    const { theta, phi } = angle;
    let minPosThetaDist = Infinity;
    let minNegThetaDist = Infinity;
    let minPosPhiDist = Infinity;
    let minNegPhiDist = Infinity;
    let posThetaKey: string | undefined;
    let negThetaKey: string | undefined;
    let posPhiKey: string | undefined;
    let negPhiKey: string | undefined;

    for (const otherAngleKey of angleKeys) {
      if (otherAngleKey === angleKey) continue;
      const otherNode = result.get(otherAngleKey)!;
      const otherAngle = cartesianToSpherical(otherNode.centroid);
      const dTheta = otherAngle.theta - theta;
      const dPhi = otherAngle.phi - phi;

      // Normalize theta difference to [-pi, pi]
      let normDTheta = dTheta;
      if (normDTheta > Math.PI) normDTheta -= 2 * Math.PI;
      if (normDTheta < -Math.PI) normDTheta += 2 * Math.PI;

      // Positive theta neighbor
      if (
        normDTheta > 0 &&
        normDTheta < minPosThetaDist &&
        Math.abs(dPhi) < 0.1
      ) {
        minPosThetaDist = normDTheta;
        posThetaKey = otherAngleKey;
      }
      // Negative theta neighbor
      if (
        normDTheta < 0 &&
        -normDTheta < minNegThetaDist &&
        Math.abs(dPhi) < 0.1
      ) {
        minNegThetaDist = -normDTheta;
        negThetaKey = otherAngleKey;
      }
      // Positive phi neighbor
      if (dPhi > 0 && dPhi < minPosPhiDist && Math.abs(normDTheta) < 0.1) {
        minPosPhiDist = dPhi;
        posPhiKey = otherAngleKey;
      }
      // Negative phi neighbor
      if (dPhi < 0 && -dPhi < minNegPhiDist && Math.abs(normDTheta) < 0.1) {
        minNegPhiDist = -dPhi;
        negPhiKey = otherAngleKey;
      }
    }

    node.neighbors.posTheta = posThetaKey;
    node.neighbors.negTheta = negThetaKey;
    node.neighbors.posPhi = posPhiKey;
    node.neighbors.negPhi = negPhiKey;
  }

  return result;
}

// filledUpToTheta = 0;
// filledUpToPhi = 0;
// nextRaycast = {theta: 0, phi: 0};
// while (filledupToTheta <= 2pi && filledupToPhi <= 2pi) {
//    const hit = raycast(nextRaycast);
//    if hit.occludes.minTheta > filledUpToTheta {
//       assert(hit.occludes.minPhi > filledUpToPhi); // Holes should always have Theta and Phi range
//       // TODO: fill up hole
//    }
//    filledUpToTheta = Math.max(filledUpToTheta, hit.occludes.maxTheta);
//    filledUpToPhi = Math.max(filledUpToPhi, hit.occludes.maxPhi);
//    // Use walking through links to neighbors or 2d hashing to get the next one above the filled up to angles without walking iteration?
//    nextRaycast = getNextRaycast(filledUpToTheta, filledUpToPhi);
// }

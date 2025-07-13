import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import {
  ThreeDimOrientation,
  OrientationString,
  VoxelFaceString,
  BlockFace,
} from "./types";
import { serializeVec3 } from "../../../utils/generic";
import { Block as PBlock } from "prismarine-block";
import { asyncSleep } from "../../../utils/generic";
import { iterators } from "prismarine-world";

const RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS = 2000;

// TODO:
// - During raycasting, gradually update the `OffsetBased3DArray`s:
//   - this.visibleBlocksInSurroundings
//   - this.surroundingsVisibilityMask
// - Update VicinitiesObserver to:
//   - Keep track of item itentities and mob entities
//   - For each vicinity, store distance-sorted, offset-based idxs for accessing the `OffsetBased3DArray`s
// - Write the Vicinity class to expose the expected API for querying the surroundings's vicinities
// - Write the ImmediateSurroundings and DistantSurroundingsInADirection classes to implement getDTO methods
// - Add MobType to thing-type implementations and test approaching mobs
// - Add KillMob skill

export class VisibilityRaycaster {
  private bot: Bot;
  private radius: number; // Radius of the sphere of interest
  public isRaycasting: boolean = false;

  private orientations: Map<OrientationString, ThreeDimOrientation> = new Map();

  // Face<->cast orientation penetration mappings
  private facesToCastOrientationsThatPenetrateThem: Map<
    VoxelFaceString, // Face identifier
    Set<OrientationString> // Penetrated by what raycast orientations
  > = new Map();

  private castOrientationsToPenetratedFaces: Map<
    OrientationString, // Raycast orientation
    Set<VoxelFaceString> // Faces penetrated by this raycast
  > = new Map();

  constructor(bot: Bot, radiusOfInterest: number) {
    if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
      throw new Error("radiusOfInterest must be a positive integer");
    }
    this.bot = bot;
    this.radius = radiusOfInterest;
    this.getOrientationsAndPenetrations();
  }

  /**
   * Helper function to serialize a face consistently
   * Uses the voxel that the face is the bottom, north, or west face of
   * @returns A string in the format "${serializeVec3(voxelOffset)},${BlockFace}"
   */
  private serializeFace(voxelPos: Vec3, face: number): VoxelFaceString {
    let canonicalVoxel: Vec3;

    switch (face) {
      case BlockFace.BOTTOM:
      case BlockFace.TOP:
        // For vertical faces, use the lower voxel (smaller Y)
        canonicalVoxel =
          face === BlockFace.BOTTOM
            ? new Vec3(voxelPos.x, voxelPos.y - 1, voxelPos.z)
            : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
        return `${serializeVec3(canonicalVoxel)},${BlockFace.BOTTOM}`;

      case BlockFace.NORTH:
      case BlockFace.SOUTH:
        // For north-south faces, use the northern voxel (smaller Z)
        canonicalVoxel =
          face === BlockFace.NORTH
            ? new Vec3(voxelPos.x, voxelPos.y, voxelPos.z - 1)
            : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
        return `${serializeVec3(canonicalVoxel)},${BlockFace.NORTH}`;

      case BlockFace.WEST:
      case BlockFace.EAST:
        // For east-west faces, use the western voxel (smaller X)
        canonicalVoxel =
          face === BlockFace.WEST
            ? new Vec3(voxelPos.x - 1, voxelPos.y, voxelPos.z)
            : new Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
        return `${serializeVec3(canonicalVoxel)},${BlockFace.WEST}`;

      default:
        throw new Error(`Unknown face: ${face}`);
    }
  }

  /**
   * Generates a list of in-radius voxel offsets sorted by distance from origin
   * @returns Array of Vec3 offsets
   */
  private getInRadiusOffsetsSortedByDistance(): Vec3[] {
    const voxelOffsets: Vec3[] = [];

    // Generate all voxel offsets within radius
    for (let x = -this.radius; x <= this.radius; x++) {
      for (let y = -this.radius; y <= this.radius; y++) {
        for (let z = -this.radius; z <= this.radius; z++) {
          // Skip zero vector and voxels outside radius
          if (x === 0 && y === 0 && z === 0) continue;

          const distance = Math.sqrt(x * x + y * y + z * z);
          if (distance < this.radius) {
            voxelOffsets.push(new Vec3(x, y, z));
          }
        }
      }
    }

    // Sort by distance from origin
    voxelOffsets.sort((a, b) => {
      const distA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      const distB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
      return distA - distB;
    });

    return voxelOffsets;
  }

  /**
   * Calculates which in-radius faces are penetrated by a raycast in the given direction
   * @returns Set of face identifiers penetrated by the raycast
   */
  private getFacesPenetratedByCast(rayDirection: Vec3): Set<VoxelFaceString> {
    const penetratedFaces = new Set<VoxelFaceString>();
    const maxDistance = this.radius + 0.5; // Slightly beyond sphere radius
    const rayOrigin = new Vec3(0.5, 0.5, 0.5); // Center of the origin voxel

    const raycastIterator = new iterators.RaycastIterator(
      rayOrigin,
      rayDirection,
      maxDistance
    );

    let currentBlock = raycastIterator.next();
    while (currentBlock !== null) {
      // Skip the origin voxel (0,0,0)
      if (
        currentBlock.x !== 0 ||
        currentBlock.y !== 0 ||
        currentBlock.z !== 0
      ) {
        const voxelPos = new Vec3(
          currentBlock.x,
          currentBlock.y,
          currentBlock.z
        );
        const faceKey = this.serializeFace(voxelPos, currentBlock.face);
        penetratedFaces.add(faceKey);
      }

      currentBlock = raycastIterator.next();
    }

    return penetratedFaces;
  }

  /**
   * Generates orientations and calculates penetration data
   * This method populates the `orientations`, `castOrientationsToPenetratedFaces`,
   * and `facesToCastOrientationsThatPenetrateThem` maps.
   */
  private getOrientationsAndPenetrations(): void {
    this.orientations = new Map();
    this.castOrientationsToPenetratedFaces = new Map();
    this.facesToCastOrientationsThatPenetrateThem = new Map();

    const alreadyPenetrated = new Set<VoxelFaceString>();
    const voxelOffsets = this.getInRadiusOffsetsSortedByDistance();

    // Face offsets: each face center is 0.5 units away from voxel center in one direction
    const faceOffsets = [
      { offset: new Vec3(0.5, 0, 0), face: BlockFace.EAST }, // +X face
      { offset: new Vec3(-0.5, 0, 0), face: BlockFace.WEST }, // -X face
      { offset: new Vec3(0, 0.5, 0), face: BlockFace.TOP }, // +Y face
      { offset: new Vec3(0, -0.5, 0), face: BlockFace.BOTTOM }, // -Y face
      { offset: new Vec3(0, 0, 0.5), face: BlockFace.SOUTH }, // +Z face
      { offset: new Vec3(0, 0, -0.5), face: BlockFace.NORTH }, // -Z face
    ];

    // Process voxels in order from closest to furthest
    for (const voxelOffset of voxelOffsets) {
      // Generate orientations for all 6 faces of this voxel
      for (const { offset: faceOffset, face } of faceOffsets) {
        const faceCenter = new Vec3(
          voxelOffset.x + faceOffset.x,
          voxelOffset.y + faceOffset.y,
          voxelOffset.z + faceOffset.z
        );

        // Create the face identifier for this face
        const faceKey = this.serializeFace(voxelOffset, face);

        // Skip if this face has already been penetrated by a previous raycast
        if (alreadyPenetrated.has(faceKey)) {
          continue;
        }

        // Create orientation pointing to this face
        const orientation = new ThreeDimOrientation({
          towards: faceCenter,
        });
        const orientationKey = orientation.serialize();

        // Store the orientation
        this.orientations.set(orientationKey, orientation);

        // Calculate which faces this raycast penetrates
        const penetratedFaces = this.getFacesPenetratedByCast(
          orientation.vecNorm
        );

        // Store the forward mapping (orientation -> faces)
        this.castOrientationsToPenetratedFaces.set(
          orientationKey,
          penetratedFaces
        );

        // Add all penetrated faces to the already-penetrated set
        for (const penetratedFace of penetratedFaces) {
          alreadyPenetrated.add(penetratedFace);
        }
      }
    }

    // Build the reverse mapping (face -> orientations that penetrate it)
    for (const [orientationKey, penetratedFaces] of this
      .castOrientationsToPenetratedFaces) {
      for (const faceKey of penetratedFaces) {
        if (!this.facesToCastOrientationsThatPenetrateThem.has(faceKey)) {
          this.facesToCastOrientationsThatPenetrateThem.set(faceKey, new Set());
        }
        this.facesToCastOrientationsThatPenetrateThem
          .get(faceKey)!
          .add(orientationKey);
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

    // Setup variables
    this.isRaycasting = true;
    const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
    const orientationsToSkip = new Set<OrientationString>();
    const maxRaycastDistance = this.radius + 0.5; // Slightly beyond sphere radius to ensure coverage
    let nRaycastsPerformed = 0;

    // Inner helper functions
    async function releaseEventLoopIfNecessary() {
      nRaycastsPerformed++;
      if (nRaycastsPerformed % RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS === 0) {
        await asyncSleep(0);
      }
    }
    const doRaycast = (
      from: Vec3,
      direction: Vec3,
      range: number
    ): [PBlock | null, number | null] => {
      const iter = new iterators.RaycastIterator(from, direction, range);
      let pos = iter.next();
      while (pos) {
        const position = new Vec3(pos.x, pos.y, pos.z);
        const block = this.bot.world.getBlock(position);
        if (block && block.name !== "air") {
          return [block, pos.face];
        }
        pos = iter.next();
      }
      return [null, null];
    };

    // Main raycasting loop
    for (const [originalRayOrientationKey, OriginalRayOrientation] of this
      .orientations) {
      if (orientationsToSkip.has(originalRayOrientationKey)) {
        continue;
      }
      const [hit, face] = doRaycast(
        fromVoxelCenter,
        OriginalRayOrientation.vecNorm,
        maxRaycastDistance
      );
      yield [OriginalRayOrientation.vecNorm, hit];
      await releaseEventLoopIfNecessary();

      if (hit && face) {
        const hitBlockOffset = hit.position.minus(fromVoxel);
        const faceKey = this.serializeFace(
          hitBlockOffset,
          face
        ) as VoxelFaceString;

        const castOrientationsThatPenetrateHitBlockFace =
          this.facesToCastOrientationsThatPenetrateThem.get(faceKey);

        if (
          castOrientationsThatPenetrateHitBlockFace &&
          castOrientationsThatPenetrateHitBlockFace.size - 1 > 4
        ) {
          // // Pepper around the block (4 raycasts-up down, left, and right of center orientation)
          // const occlusionRadius = Math.atan(
          //   0.495 / hit.position.distanceTo(fromVoxel)
          // );
          // const orientationTowardsBlock = new ThreeDimOrientation({
          //   towards: hit.position.minus(fromVoxel),
          // });
          // for (const offsetOrientation of orientationTowardsBlock.getCardinalOffsets(
          //   occlusionRadius
          // )) {
          //   const hitAtOffset: PBlock | null = this.bot.world.raycast(
          //     fromVoxelCenter,
          //     offsetOrientation.vecNorm,
          //     maxRaycastDistance
          //   );
          //   yield [offsetOrientation.vecNorm, hitAtOffset];
          //   await releaseEventLoopIfNecessary();
          // }

          // In the future, skip the orientations that penetrate the hit block
          for (const penetratorOrientationKey of castOrientationsThatPenetrateHitBlockFace) {
            orientationsToSkip.add(penetratorOrientationKey);
          }
        }
      }
    }
    this.isRaycasting = false;
  }
}

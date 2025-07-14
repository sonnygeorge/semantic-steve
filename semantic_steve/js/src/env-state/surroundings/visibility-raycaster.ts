import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { ThreeDimOrientation } from "../../utils/orientation";
import {
  SerializedOrientation,
  SerializedVoxelOffset,
  BlockFace,
  VoxelFace,
} from "../../types";
import { serializeVoxelOffsetFace } from "../../utils/voxel";
import { Block as PBlock } from "prismarine-block";
import { asyncSleep, serializeVec3 } from "../../utils/generic";
import { OffsetBased3DArray } from "../../utils/array";
import { iterators } from "prismarine-world";
import { isVoxel } from "../../utils/voxel";

const RELEASE_EVENT_LOOP_EVERY_N_MS = 80;

export class VisibilityRaycaster {
  private bot: Bot;
  private radius: number; // Radius of the sphere of interest
  public isRaycasting: boolean = false;

  private orientations: Map<SerializedOrientation, ThreeDimOrientation> =
    new Map();

  // Face<->cast orientation penetration mappings
  private facesToCastOrientationsThatPenetrateThem: Map<
    SerializedVoxelOffset, // Face identifier
    Set<SerializedOrientation> // Penetrated by what raycast orientations
  > = new Map();

  private castOrientationsToPenetratedFaces: Map<
    SerializedOrientation, // Raycast orientation
    Set<SerializedVoxelOffset> // Faces penetrated by this raycast
  > = new Map();

  // Offset-based 3D arrays that store the continualy updating raycast results
  public visibleBlocks: OffsetBased3DArray<PBlock | null>;
  public visibilityMask: OffsetBased3DArray<boolean>;

  constructor(bot: Bot, radiusOfInterest: number) {
    if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
      throw new Error("radiusOfInterest must be a positive integer");
    }
    this.bot = bot;
    this.radius = radiusOfInterest;
    this.getOrientationsAndPenetrations();
    const arrayDimension = 2 * this.radius + 1; // To enclose the sphere of interest
    this.visibleBlocks = new OffsetBased3DArray<PBlock | null>(
      arrayDimension,
      null
    );
    this.visibilityMask = new OffsetBased3DArray<boolean>(
      arrayDimension,
      false
    );
  }

  /**
   * Generates a list of in-radius voxel offsets sorted by distance from origin
   * @returns Array of Vec3 offsets
   */
  private getDistanceSortedVoxelOffsets(): Vec3[] {
    const voxelOffsets: Vec3[] = [];
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
  private getFacesPenetratedByCast(
    rayDirection: Vec3
  ): Set<SerializedVoxelOffset> {
    const penetratedFaces = new Set<SerializedVoxelOffset>();
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
        const faceKey = serializeVoxelOffsetFace(voxelPos, currentBlock.face);
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
    const faceOffsets = [
      { offset: new Vec3(0.5, 0, 0), face: BlockFace.EAST }, // +X face
      { offset: new Vec3(-0.5, 0, 0), face: BlockFace.WEST }, // -X face
      { offset: new Vec3(0, 0.5, 0), face: BlockFace.TOP }, // +Y face
      { offset: new Vec3(0, -0.5, 0), face: BlockFace.BOTTOM }, // -Y face
      { offset: new Vec3(0, 0, 0.5), face: BlockFace.SOUTH }, // +Z face
      { offset: new Vec3(0, 0, -0.5), face: BlockFace.NORTH }, // -Z face
    ];

    this.orientations = new Map();
    this.castOrientationsToPenetratedFaces = new Map();
    this.facesToCastOrientationsThatPenetrateThem = new Map();

    const alreadyPenetrated = new Set<SerializedVoxelOffset>();
    const voxelOffsets = this.getDistanceSortedVoxelOffsets();

    for (const voxelOffset of voxelOffsets) {
      for (const { offset: faceOffset, face } of faceOffsets) {
        const faceCenter = new Vec3(
          voxelOffset.x + faceOffset.x,
          voxelOffset.y + faceOffset.y,
          voxelOffset.z + faceOffset.z
        );
        const faceKey = serializeVoxelOffsetFace(voxelOffset, face);
        if (alreadyPenetrated.has(faceKey)) {
          continue;
        }
        const orientation = new ThreeDimOrientation({
          towards: faceCenter,
        });
        const orientationKey = orientation.serialize();
        this.orientations.set(orientationKey, orientation);
        const facesPenetratedByOrientation = this.getFacesPenetratedByCast(
          orientation.vecNorm
        );
        // Store this in th map of cast orientations to their penetrated faces
        this.castOrientationsToPenetratedFaces.set(
          orientationKey,
          facesPenetratedByOrientation
        );
        // We shouldn't add more orientations to reach faces that we already reach
        for (const penetratedFace of facesPenetratedByOrientation) {
          alreadyPenetrated.add(penetratedFace);
        }
      }
    }

    // Build the reverse mapping from faces to orientations that penetrate them
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
   * Performs a raycast from a given position in a specified direction up until this.radius,
   * updating the visibility mask and visible blocks arrays as the raycast progresses.
   *
   * @param from - The starting position of the raycast.
   * @param direction - The normalized direction vector of the raycast.
   * @param alreadyAscertainedVoxels - A set of voxel offsets that have already been checked
   *                                   to avoid redundant checks. NOTE: This set is mutated
   *                                   within this function!
   * @returns A tuple containing the first block hit by the raycast and the face it hit,
   *          or null if no block was hit.
   */
  private doRaycast(
    from: Vec3,
    direction: Vec3,
    alreadyAscertainedVoxels: Set<SerializedVoxelOffset>
  ): [PBlock | null, number | null] {
    const iter = new iterators.RaycastIterator(
      from,
      direction,
      this.radius + 0.5
    );
    let pos = iter.next();
    let hit: [PBlock, iterators.BlockFace] | null = null;
    while (pos) {
      const position = new Vec3(pos.x, pos.y, pos.z);
      const serializedPosition = serializeVec3(position);
      const offset = position.floored().minus(from);
      if (hit && !alreadyAscertainedVoxels.has(serializedPosition)) {
        // This offset should be provisionally considered invisible.
        // "Provisionally" since we are not adding it to the set of already ascertained
        // voxels, meaning, the offset voxel can be hit later via a different entry face.
        this.visibleBlocks.unsetFromOffset(offset);
        this.visibilityMask.unsetFromOffset(offset);
      } else if (!hit && !alreadyAscertainedVoxels.has(serializedPosition)) {
        const block = this.bot.world.getBlock(position);
        // Any air/null that we hit is just an unobstructed (see-through) voxel
        if (block === null || block.name === "air") {
          this.visibleBlocks.unsetFromOffset(offset); // No block at this offset
          this.visibilityMask.setFromOffset(offset, true); // Rays pass through = visible
        } else {
          // The first block has been reached by this raycast and is our hit!
          this.visibleBlocks.setFromOffset(offset, block); // Add block to visible blocks
          this.visibilityMask.setFromOffset(offset, true); // Mark offset as visible
          hit = [block, pos.face];
        }
        alreadyAscertainedVoxels.add(serializedPosition); // Mark this voxel as checked
      }
      pos = iter.next();
    }
    return hit ?? [null, null];
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
    assert(isVoxel(fromVoxel));

    let msElapsedWhileRaycasting = 0;
    const start = performance.now();
    let timeOfLastStart = start;

    // Variable setup
    this.isRaycasting = true;
    let nRaycastsPerformed = 0;
    const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
    const orientationsToSkip = new Set<SerializedOrientation>();
    const alreadyAscertainedVoxels: Set<SerializedVoxelOffset> = new Set();

    // Inner helper function to release event loop every N raycasts
    async function releaseEventLoopIfNecessary() {
      const elapsedSinceLastStart = performance.now() - timeOfLastStart;
      if (elapsedSinceLastStart > RELEASE_EVENT_LOOP_EVERY_N_MS) {
        msElapsedWhileRaycasting += elapsedSinceLastStart;
        await asyncSleep(0);
        timeOfLastStart = performance.now();
      }
    }

    // Main raycasting loop
    for (const [originalRayOrientationKey, OriginalRayOrientation] of this
      .orientations) {
      if (orientationsToSkip.has(originalRayOrientationKey)) {
        continue;
      }
      const [hit, face] = this.doRaycast(
        fromVoxelCenter,
        OriginalRayOrientation.vecNorm,
        alreadyAscertainedVoxels
      );
      nRaycastsPerformed++;
      yield [OriginalRayOrientation.vecNorm, hit];
      await releaseEventLoopIfNecessary();
      // Once we've hit a face, we can skip the other orientations that penetrate this face
      if (hit && face) {
        const hitBlockOffset = hit.position.minus(fromVoxel);
        const faceKey = serializeVoxelOffsetFace(
          hitBlockOffset,
          face
        ) as SerializedVoxelOffset;
        const castOrientationsThatPenetrateHitBlockFace =
          this.facesToCastOrientationsThatPenetrateThem.get(faceKey);
        if (castOrientationsThatPenetrateHitBlockFace) {
          for (const penetratorOrientationKey of castOrientationsThatPenetrateHitBlockFace) {
            orientationsToSkip.add(penetratorOrientationKey);
          }
        }
      }
    }

    // Log performance metrics
    const end = performance.now();
    const totalMsElapsed = Math.round(end - start);
    msElapsedWhileRaycasting += end - timeOfLastStart;
    msElapsedWhileRaycasting = Math.round(msElapsedWhileRaycasting);
    console.log(
      `${msElapsedWhileRaycasting}ms spent raycasting | ` +
        `${totalMsElapsed - msElapsedWhileRaycasting}ms spent elsewhere`
    );

    this.isRaycasting = false;
  }
}

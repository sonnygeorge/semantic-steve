import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Symmetrical3DArray } from "../../utils/generic";
import { getVoxelOfPosition } from "../../utils/misc";

/**
 * Wrapper around a 3D array that represents a voxel space around the bot's eyes
 */
export class VoxelSpaceAroundBotEyes<T> {
  private bot: Bot;
  public eyePosAtLastUpdate: Vec3 | undefined;
  private radiusOfInterest: number;
  public voxelSpace: Symmetrical3DArray<T>; // 3D array representing the voxel space
  public dimension: number;

  constructor(bot: Bot, radiusOfInterest: number, defaultValue: T | (() => T)) {
    this.bot = bot;
    this.radiusOfInterest = radiusOfInterest;
    // 3D voxel-space array where center-most voxel = block area of the bot's eyes
    this.dimension = radiusOfInterest * 2 + 1;
    this.voxelSpace = new Symmetrical3DArray(this.dimension, defaultValue);
  }

  public setInitialEyePos(curEyePos: Vec3): void {
    assert(!this.eyePosAtLastUpdate, "Initial eye position already set");
    this.eyePosAtLastUpdate = curEyePos;
  }

  public *iterAllOffsets(): Generator<Vec3> {
    for (let x = -this.radiusOfInterest; x <= this.radiusOfInterest; x++) {
      for (let y = -this.radiusOfInterest; y <= this.radiusOfInterest; y++) {
        for (let z = -this.radiusOfInterest; z <= this.radiusOfInterest; z++) {
          yield new Vec3(x, y, z);
        }
      }
    }
  }

  public *iterOffsetsWithSetValues(): Generator<Vec3> {
    // NOTE: Copy to avoid mutation during iteration
    for (const idxs of new Map(this.voxelSpace.idxsWithSetValues).values()) {
      yield this.indicesToOffset(idxs)!;
    }
  }

  private areIndicesWithinBounds(indices: [number, number, number]): boolean {
    return (
      indices[0] >= 0 &&
      indices[0] < this.dimension &&
      indices[1] >= 0 &&
      indices[1] < this.dimension &&
      indices[2] >= 0 &&
      indices[2] < this.dimension
    );
  }

  public indicesToOffset(indices: [number, number, number]): Vec3 | null {
    if (!this.areIndicesWithinBounds(indices)) {
      return null;
    }
    return new Vec3(
      indices[0] - this.radiusOfInterest,
      indices[1] - this.radiusOfInterest,
      indices[2] - this.radiusOfInterest
    );
  }

  public offsetToIndices(offset: Vec3): [number, number, number] | null {
    const voxelOfOffset = getVoxelOfPosition(offset);
    const idxs: [number, number, number] = [
      voxelOfOffset.x + this.radiusOfInterest,
      voxelOfOffset.y + this.radiusOfInterest,
      voxelOfOffset.z + this.radiusOfInterest,
    ];
    if (this.areIndicesWithinBounds(idxs)) {
      return idxs;
    } else {
      return null;
    }
  }

  private eyesHaveMovedToNewVoxel(prevEyePos: Vec3, curEyePos: Vec3): boolean {
    assert(this.eyePosAtLastUpdate);
    const prevVoxel = getVoxelOfPosition(prevEyePos);
    const curVoxel = getVoxelOfPosition(curEyePos);
    const eyesAreInNewVoxel = !prevVoxel.equals(curVoxel);
    // if (eyesAreInNewVoxel) {
    //   console.log(
    //     `Eyes have moved to a new voxel since last update: ${prevVoxel} -> ${curVoxel}`
    //   );
    // }
    return eyesAreInNewVoxel;
  }

  public getFromOffset(offset: Vec3): T | null {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      return null;
    }
    return this.voxelSpace.get(indices[0], indices[1], indices[2]);
  }

  public setFromOffset(offset: Vec3, value: T): boolean {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      console.log(
        `Tried to set value at offset ${offset} but it is out of bounds`
      );
      return false;
    }
    this.voxelSpace.set(indices[0], indices[1], indices[2], value);
    return true;
  }

  public unsetFromOffset(offset: Vec3): boolean {
    const indices = this.offsetToIndices(offset);
    if (!indices) {
      return false;
    }
    this.voxelSpace.unset(indices[0], indices[1], indices[2]);
    return true;
  }

  public getFromWorldPosition(worldPos: Vec3, eyePos: Vec3): T | null {
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
    if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
      const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
      console.log(msg);
      throw new Error(msg);
    }
    const curEyeVoxel = getVoxelOfPosition(eyePos);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    return this.getFromOffset(offset);
  }

  public setFromWorldPosition(worldPos: Vec3, eyePos: Vec3, value: T): boolean {
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
    if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
      const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
      console.log(msg);
      throw new Error(msg);
    }
    const curEyeVoxel = getVoxelOfPosition(eyePos);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    return this.setFromOffset(offset, value);
  }

  public unsetFromWorldPosition(worldPos: Vec3, eyePos: Vec3): boolean {
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
    if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
      const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
      console.log(msg);
      throw new Error(msg);
    }
    const curEyeVoxel = getVoxelOfPosition(eyePos);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    return this.unsetFromOffset(offset);
  }

  public updateEyePosAndShiftAsNeeded(curEyePos: Vec3): Vec3 | undefined {
    assert(this.eyePosAtLastUpdate);
    const prevEyePos = this.eyePosAtLastUpdate.clone();
    this.eyePosAtLastUpdate = curEyePos;
    const shouldShiftVoxelSpace = this.eyesHaveMovedToNewVoxel(
      prevEyePos,
      curEyePos
    );

    // If the eyes have not moved to a new voxel, no need to shift values
    if (!shouldShiftVoxelSpace) return;

    // Otherwise, perform the shift of values in voxel space
    const prevEyeVoxel = getVoxelOfPosition(prevEyePos);
    const curEyeVoxel = getVoxelOfPosition(curEyePos);
    const shiftOffset = prevEyeVoxel.minus(curEyeVoxel);

    const valsBeforeOverwrites = new Map<string, T>(); // Instead of creating/storing a 2nd full array
    const alreadyShiftedToIdxs = new Set<string>(); // To avoid unsetting of shifted-to idxs

    for (const [originIdxKey, [originXIdx, originYIdx, originZIdx]] of new Map(
      this.voxelSpace.idxsWithSetValues // Create a copy to avoid mutation during iteration
    )) {
      // Shift destination
      const destinationXIdx = originXIdx + shiftOffset.x;
      const destinationYIdx = originYIdx + shiftOffset.y;
      const destinationZIdx = originZIdx + shiftOffset.z;
      // Some checks
      const destinationIsWithinBounds =
        destinationXIdx >= 0 &&
        destinationXIdx < this.dimension &&
        destinationYIdx >= 0 &&
        destinationYIdx < this.dimension &&
        destinationZIdx >= 0 &&
        destinationZIdx < this.dimension;
      const originIdxWasPreviouslyOverwritten =
        alreadyShiftedToIdxs.has(originIdxKey);
      const destinationIdxKey = this.voxelSpace.serializeIdx(
        destinationXIdx,
        destinationYIdx,
        destinationZIdx
      );
      const destinationIdxHasASetValue =
        this.voxelSpace.idxsWithSetValues.has(destinationIdxKey);

      if (destinationIsWithinBounds) {
        // If we are going to overwrite an idx with a set value, save it before overwriting
        if (destinationIdxHasASetValue) {
          const valAtDestinationIdx = this.voxelSpace.get(
            destinationXIdx,
            destinationYIdx,
            destinationZIdx
          );
          valsBeforeOverwrites.set(destinationIdxKey, valAtDestinationIdx);
        }

        // Perform the shift
        let valueToShift: T;
        if (originIdxWasPreviouslyOverwritten) {
          // If the origin idx was previously overwritten, we want to shift its pre-overwrite value
          valueToShift = valsBeforeOverwrites.get(originIdxKey)!;
        } else {
          valueToShift = this.voxelSpace.get(
            originXIdx,
            originYIdx,
            originZIdx
          );
        }
        this.voxelSpace.set(
          destinationXIdx,
          destinationYIdx,
          destinationZIdx,
          valueToShift
        );
        // Mark the destination idx as already shifted to
        alreadyShiftedToIdxs.add(destinationIdxKey);
      }

      // Now, if the origin idx was already overwritten, we don't want to unset it's new value,
      // otherwise, we do want to unset it
      if (!originIdxWasPreviouslyOverwritten) {
        this.voxelSpace.unset(originXIdx, originYIdx, originZIdx);
      }
    }

    return shiftOffset; // Return the shift offset for further use if needed
  }
}

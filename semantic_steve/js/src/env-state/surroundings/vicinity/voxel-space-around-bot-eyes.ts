import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Symmetrical3DArray } from "../../../utils/generic";
import { getCurEyePos } from "../../../utils/misc";
import { getVoxelOfPosition } from "../../../utils/misc";

/**
 * Wrapper around a 3D array that represents a voxel space around the bot's eyes
 */
export class VoxelSpaceAroundBotEyes<T> {
  private bot: Bot;
  private botEyePosAtLastUpdate: Vec3;
  private radiusOfInterest: number;
  private voxelSpace: Symmetrical3DArray<T>; // 3D array representing the voxel space
  public dimension: number;

  constructor(bot: Bot, radiusOfInterest: number, defaultValue: T | (() => T)) {
    this.bot = bot;
    this.botEyePosAtLastUpdate = getCurEyePos(bot);
    this.radiusOfInterest = radiusOfInterest;
    // 3D voxel-space array where center-most voxel = block area of the bot's eyes
    this.dimension = radiusOfInterest * 2 + 1;
    this.voxelSpace = new Symmetrical3DArray(this.dimension, defaultValue);
  }

  private offsetToIndices(offset: Vec3): [number, number, number] {
    const x = Math.floor(offset.x) + this.radiusOfInterest;
    const y = Math.floor(offset.y) + this.radiusOfInterest;
    const z = Math.floor(offset.z) + this.radiusOfInterest;
    return [x, y, z];
  }

  private eyesHaveMovedToNewVoxelSinceLastUpdate(): boolean {
    return !getVoxelOfPosition(getCurEyePos(this.bot)).equals(
      getVoxelOfPosition(this.botEyePosAtLastUpdate)
    );
  }

  public getFromBotOffset(offset: Vec3): T {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const [x, y, z] = this.offsetToIndices(offset);
    return this.voxelSpace.get(x, y, z);
  }

  public setFromBotOffset(offset: Vec3, value: T): void {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const [x, y, z] = this.offsetToIndices(offset);
    this.voxelSpace.set(x, y, z, value);
  }

  public unsetFromBotOffset(offset: Vec3): void {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const [x, y, z] = this.offsetToIndices(offset);
    this.voxelSpace.unset(x, y, z);
  }

  public getFromWorldPosition(worldPos: Vec3): T {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    const curEyeVoxel = getVoxelOfPosition(this.botEyePosAtLastUpdate);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    return this.getFromBotOffset(offset);
  }

  public setFromWorldPosition(worldPos: Vec3, value: T): void {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    const curEyeVoxel = getVoxelOfPosition(this.botEyePosAtLastUpdate);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    this.setFromBotOffset(offset, value);
  }

  public unsetFromWorldPosition(worldPos: Vec3): void {
    assert(!this.eyesHaveMovedToNewVoxelSinceLastUpdate());
    const absVoxelOfWorldPos = getVoxelOfPosition(worldPos);
    const curEyeVoxel = getVoxelOfPosition(this.botEyePosAtLastUpdate);
    const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
    this.unsetFromBotOffset(offset);
  }

  public updateBotEyePos(): void {
    const prevEyePos = this.botEyePosAtLastUpdate;
    const curEyePos = getCurEyePos(this.bot);
    const shouldShiftVoxelSpace = this.eyesHaveMovedToNewVoxelSinceLastUpdate();
    this.botEyePosAtLastUpdate = curEyePos; // Note: this can't go before the above check

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
  }
}

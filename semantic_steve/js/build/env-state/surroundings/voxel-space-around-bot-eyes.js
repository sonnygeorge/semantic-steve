"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoxelSpaceAroundBotEyes = void 0;
const assert_1 = __importDefault(require("assert"));
const vec3_1 = require("vec3");
const generic_1 = require("../../utils/generic");
const misc_1 = require("../../utils/misc");
/**
 * Wrapper around a 3D array that represents a voxel space around the bot's eyes
 */
class VoxelSpaceAroundBotEyes {
    constructor(bot, radiusOfInterest, defaultValue) {
        this.bot = bot;
        this.radiusOfInterest = radiusOfInterest;
        // 3D voxel-space array where center-most voxel = block area of the bot's eyes
        this.dimension = radiusOfInterest * 2 + 1;
        this.voxelSpace = new generic_1.Symmetrical3DArray(this.dimension, defaultValue);
    }
    setInitialEyePos(curEyePos) {
        (0, assert_1.default)(!this.eyePosAtLastUpdate, "Initial eye position already set");
        this.eyePosAtLastUpdate = curEyePos;
    }
    *iterAllOffsets() {
        for (let x = -this.radiusOfInterest; x <= this.radiusOfInterest; x++) {
            for (let y = -this.radiusOfInterest; y <= this.radiusOfInterest; y++) {
                for (let z = -this.radiusOfInterest; z <= this.radiusOfInterest; z++) {
                    yield new vec3_1.Vec3(x, y, z);
                }
            }
        }
    }
    *iterOffsetsWithSetValues() {
        // NOTE: Copy to avoid mutation during iteration
        for (const idxs of new Map(this.voxelSpace.idxsWithSetValues).values()) {
            yield this.indicesToOffset(idxs);
        }
    }
    areIndicesWithinBounds(indices) {
        return (indices[0] >= 0 &&
            indices[0] < this.dimension &&
            indices[1] >= 0 &&
            indices[1] < this.dimension &&
            indices[2] >= 0 &&
            indices[2] < this.dimension);
    }
    indicesToOffset(indices) {
        if (!this.areIndicesWithinBounds(indices)) {
            return null;
        }
        return new vec3_1.Vec3(indices[0] - this.radiusOfInterest, indices[1] - this.radiusOfInterest, indices[2] - this.radiusOfInterest);
    }
    offsetToIndices(offset) {
        const voxelOfOffset = (0, misc_1.getVoxelOfPosition)(offset);
        const idxs = [
            voxelOfOffset.x + this.radiusOfInterest,
            voxelOfOffset.y + this.radiusOfInterest,
            voxelOfOffset.z + this.radiusOfInterest,
        ];
        if (this.areIndicesWithinBounds(idxs)) {
            return idxs;
        }
        else {
            return null;
        }
    }
    eyesHaveMovedToNewVoxel(prevEyePos, curEyePos) {
        (0, assert_1.default)(this.eyePosAtLastUpdate);
        const prevVoxel = (0, misc_1.getVoxelOfPosition)(prevEyePos);
        const curVoxel = (0, misc_1.getVoxelOfPosition)(curEyePos);
        const eyesAreInNewVoxel = !prevVoxel.equals(curVoxel);
        // if (eyesAreInNewVoxel) {
        //   console.log(
        //     `Eyes have moved to a new voxel since last update: ${prevVoxel} -> ${curVoxel}`
        //   );
        // }
        return eyesAreInNewVoxel;
    }
    getFromOffset(offset) {
        const indices = this.offsetToIndices(offset);
        if (!indices) {
            return null;
        }
        return this.voxelSpace.get(indices[0], indices[1], indices[2]);
    }
    setFromOffset(offset, value) {
        const indices = this.offsetToIndices(offset);
        if (!indices) {
            console.log(`Tried to set value at offset ${offset} but it is out of bounds`);
            return false;
        }
        this.voxelSpace.set(indices[0], indices[1], indices[2], value);
        return true;
    }
    unsetFromOffset(offset) {
        const indices = this.offsetToIndices(offset);
        if (!indices) {
            return false;
        }
        this.voxelSpace.unset(indices[0], indices[1], indices[2]);
        return true;
    }
    getFromWorldPosition(worldPos, eyePos) {
        const absVoxelOfWorldPos = (0, misc_1.getVoxelOfPosition)(worldPos);
        // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
        if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
            const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
            console.log(msg);
            throw new Error(msg);
        }
        const curEyeVoxel = (0, misc_1.getVoxelOfPosition)(eyePos);
        const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
        return this.getFromOffset(offset);
    }
    setFromWorldPosition(worldPos, eyePos, value) {
        const absVoxelOfWorldPos = (0, misc_1.getVoxelOfPosition)(worldPos);
        // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
        if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
            const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
            console.log(msg);
            throw new Error(msg);
        }
        const curEyeVoxel = (0, misc_1.getVoxelOfPosition)(eyePos);
        const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
        return this.setFromOffset(offset, value);
    }
    unsetFromWorldPosition(worldPos, eyePos) {
        const absVoxelOfWorldPos = (0, misc_1.getVoxelOfPosition)(worldPos);
        // assert(this.eyePosAtLastUpdate && eyePos.equals(this.eyePosAtLastUpdate));
        if (!this.eyePosAtLastUpdate || !eyePos.equals(this.eyePosAtLastUpdate)) {
            const msg = `Eye position at last update (${this.eyePosAtLastUpdate}) does not match argument for 'eyePos'; (${eyePos})`;
            console.log(msg);
            throw new Error(msg);
        }
        const curEyeVoxel = (0, misc_1.getVoxelOfPosition)(eyePos);
        const offset = absVoxelOfWorldPos.minus(curEyeVoxel);
        return this.unsetFromOffset(offset);
    }
    updateEyePosAndShiftAsNeeded(curEyePos) {
        (0, assert_1.default)(this.eyePosAtLastUpdate);
        const prevEyePos = this.eyePosAtLastUpdate.clone();
        this.eyePosAtLastUpdate = curEyePos;
        const shouldShiftVoxelSpace = this.eyesHaveMovedToNewVoxel(prevEyePos, curEyePos);
        // If the eyes have not moved to a new voxel, no need to shift values
        if (!shouldShiftVoxelSpace)
            return;
        // Otherwise, perform the shift of values in voxel space
        const prevEyeVoxel = (0, misc_1.getVoxelOfPosition)(prevEyePos);
        const curEyeVoxel = (0, misc_1.getVoxelOfPosition)(curEyePos);
        const shiftOffset = prevEyeVoxel.minus(curEyeVoxel);
        const valsBeforeOverwrites = new Map(); // Instead of creating/storing a 2nd full array
        const alreadyShiftedToIdxs = new Set(); // To avoid unsetting of shifted-to idxs
        for (const [originIdxKey, [originXIdx, originYIdx, originZIdx]] of new Map(this.voxelSpace.idxsWithSetValues // Create a copy to avoid mutation during iteration
        )) {
            // Shift destination
            const destinationXIdx = originXIdx + shiftOffset.x;
            const destinationYIdx = originYIdx + shiftOffset.y;
            const destinationZIdx = originZIdx + shiftOffset.z;
            // Some checks
            const destinationIsWithinBounds = destinationXIdx >= 0 &&
                destinationXIdx < this.dimension &&
                destinationYIdx >= 0 &&
                destinationYIdx < this.dimension &&
                destinationZIdx >= 0 &&
                destinationZIdx < this.dimension;
            const originIdxWasPreviouslyOverwritten = alreadyShiftedToIdxs.has(originIdxKey);
            const destinationIdxKey = this.voxelSpace.serializeIdx(destinationXIdx, destinationYIdx, destinationZIdx);
            const destinationIdxHasASetValue = this.voxelSpace.idxsWithSetValues.has(destinationIdxKey);
            if (destinationIsWithinBounds) {
                // If we are going to overwrite an idx with a set value, save it before overwriting
                if (destinationIdxHasASetValue) {
                    const valAtDestinationIdx = this.voxelSpace.get(destinationXIdx, destinationYIdx, destinationZIdx);
                    valsBeforeOverwrites.set(destinationIdxKey, valAtDestinationIdx);
                }
                // Perform the shift
                let valueToShift;
                if (originIdxWasPreviouslyOverwritten) {
                    // If the origin idx was previously overwritten, we want to shift its pre-overwrite value
                    valueToShift = valsBeforeOverwrites.get(originIdxKey);
                }
                else {
                    valueToShift = this.voxelSpace.get(originXIdx, originYIdx, originZIdx);
                }
                this.voxelSpace.set(destinationXIdx, destinationYIdx, destinationZIdx, valueToShift);
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
exports.VoxelSpaceAroundBotEyes = VoxelSpaceAroundBotEyes;

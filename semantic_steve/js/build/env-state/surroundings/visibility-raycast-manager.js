"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityRaycastManager = void 0;
const assert_1 = __importDefault(require("assert"));
const generic_1 = require("../../utils/generic");
const misc_1 = require("../../utils/misc");
const voxel_space_around_bot_eyes_1 = require("./voxel-space-around-bot-eyes");
const asserts_1 = require("./asserts");
function getVoxelPenetrationsOfRaycast(direction, maxDistance, step = 0.1 // Adjust based on voxel size for accuracy vs performance
) {
    const voxels = [];
    const alreadyAdded = new Set();
    for (let distance = 0; distance <= maxDistance; distance += step) {
        const point = direction.scaled(distance);
        const voxel = (0, misc_1.getVoxelOfPosition)(point);
        if (!alreadyAdded.has((0, generic_1.serializeVec3)(voxel))) {
            voxels.push(voxel);
            alreadyAdded.add((0, generic_1.serializeVec3)(voxel));
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
class VisibilityRaycastManager {
    constructor(bot, radiusOfInterest, numRaycastOrientations = 13572) {
        (0, asserts_1.assertMinimumRaycastDensity)(radiusOfInterest, numRaycastOrientations);
        this.bot = bot;
        this.radiusOfInterest = radiusOfInterest;
        // -------------------------------------------
        // Precalculate certain maps for quick lookup
        // -------------------------------------------
        // Calculate the raycasts orientations
        this.raycasts = new Map([
            ...(0, generic_1.generateUniformlyDistributed3DOrientations)(numRaycastOrientations),
        ].map((orientation) => [orientation.serialize(), orientation]));
        // Calculate the voxel penetrations for the casts
        this.raycastsToVoxelPenetrations = new Map();
        this.voxelsToCastsThatPenetrateThem = new Map();
        for (const [raycastKey, orientation] of this.raycasts) {
            // Get the voxels penetrated by raycasting until radius in this direction
            const penetratedVoxels = getVoxelPenetrationsOfRaycast(orientation.directionVector, radiusOfInterest);
            // Store this info in maps for quick lookup later
            this.raycastsToVoxelPenetrations.set(raycastKey, penetratedVoxels);
            for (const voxel of penetratedVoxels) {
                const voxelKey = (0, generic_1.serializeVec3)(voxel);
                if (!this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
                    this.voxelsToCastsThatPenetrateThem.set(voxelKey, []);
                }
                this.voxelsToCastsThatPenetrateThem.get(voxelKey).push(raycastKey);
            }
        }
        // ---------------------------------------------------
        // Initialize the continually updated data structures
        // ---------------------------------------------------
        this.raycastsToHits = new Map();
        // console.log(
        //   `Initializing ${this.raycasts.size} managed raycasts with radius of interest ${radiusOfInterest}`
        // );
        this.hitsOrganizedIntoVoxelSpace = new voxel_space_around_bot_eyes_1.VoxelSpaceAroundBotEyes(bot, radiusOfInterest, () => [] // Default factory to initialize empty arrays for hits arrays
        );
        this.visibilityMask = new voxel_space_around_bot_eyes_1.VoxelSpaceAroundBotEyes(bot, radiusOfInterest, false);
    }
    getRaycastsAroundVoxel(forWorldVoxel, numSurroundingVoxelsRadius = 1) {
        const radius = Math.ceil(numSurroundingVoxelsRadius !== null && numSurroundingVoxelsRadius !== void 0 ? numSurroundingVoxelsRadius : 1);
        const raycasts = new Set();
        // Iterate over a cube centered on forWorldVoxel
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const voxel = forWorldVoxel.offset(x, y, z);
                    const voxelKey = (0, generic_1.serializeVec3)(voxel);
                    // Add all raycasts that penetrate this voxel
                    if (this.voxelsToCastsThatPenetrateThem.has(voxelKey)) {
                        for (const raycastKey of this.voxelsToCastsThatPenetrateThem.get(voxelKey)) {
                            raycasts.add(raycastKey);
                        }
                    }
                }
            }
        } // NOTE: This is a cubic search, not spherical, for simplicity
        return raycasts;
    }
    removePreviousRaycastData(raycastKey) {
        // Remove previous hit data
        const previousHit = this.raycastsToHits.get(raycastKey);
        if (previousHit) {
            // Remove the hit from the raycastsToHits map
            this.raycastsToHits.delete(raycastKey);
            // Remove the hit from voxel-associated array in hitsOrganizedIntoVoxelSpace
            const arrayOfHitsForVoxel = this.hitsOrganizedIntoVoxelSpace.getFromWorldPosition(previousHit, this.hitsOrganizedIntoVoxelSpace.eyePosAtLastUpdate);
            const arrayOfHitsForVoxelIndex = arrayOfHitsForVoxel.indexOf(previousHit);
            if (arrayOfHitsForVoxelIndex === -1) {
                // If the hit was not found in the array, something is wrong
                const sliced = arrayOfHitsForVoxel.slice(0, 5);
                const msg = `Hit ${previousHit} not found in array of hits for voxel: ${sliced}`;
                // console.log(msg);
                throw new Error(msg);
            }
            arrayOfHitsForVoxel.splice(arrayOfHitsForVoxelIndex, 1);
            // If there is no longer anything visible in the voxel, unset the idx in the visibility mask
            if (arrayOfHitsForVoxel.length === 0) {
                (0, assert_1.default)(this.visibilityMask.getFromWorldPosition(previousHit, this.visibilityMask.eyePosAtLastUpdate) === true, "Corrupt state: visibility mask should have been true if the voxel had a hit");
                this.visibilityMask.unsetFromWorldPosition(previousHit, this.visibilityMask.eyePosAtLastUpdate);
            }
        }
    }
    doRaycastAndStoreData(raycastKey, curEyePos) {
        const orientation = this.raycasts.get(raycastKey);
        (0, assert_1.default)(orientation);
        // Assert that voxel space arrays are up to date with current eye position
        (0, assert_1.default)(curEyePos.equals(this.hitsOrganizedIntoVoxelSpace.eyePosAtLastUpdate) &&
            curEyePos.equals(this.visibilityMask.eyePosAtLastUpdate));
        // Raycast from the bot's eye position in the direction of the orientation
        const hit = this.bot.world.raycast(curEyePos, orientation.directionVector, this.radiusOfInterest);
        if (hit && hit.intersect) {
            // Add the hit to the raycastsToHits map
            this.raycastsToHits.set(raycastKey, hit.intersect);
            // Add the hit to the voxel-space-organized hits
            const arrayOfHitsForVoxel = this.hitsOrganizedIntoVoxelSpace.getFromWorldPosition(hit.intersect, curEyePos);
            if (!arrayOfHitsForVoxel) {
                let msg = `Since we pass a max range arg to bot.world.raycast, any hits should always be in the voxel space. `;
                msg += `Perhaps it was a floating point error that kept a hit just out of bounds? `;
                const hitDistance = hit.intersect.distanceTo(curEyePos);
                msg += `Hit distance to bot: ${hitDistance}, distant surroundings radius: ${this.radiusOfInterest}`;
                throw new Error(msg);
            }
            arrayOfHitsForVoxel.push(hit.intersect);
            // Set the voxel in the mask to true if it wasn't already
            this.visibilityMask.setFromWorldPosition(hit.intersect, curEyePos, true);
        }
    }
    updateRaycasts(curEyePos, strategy = "everywhere") {
        // console.log(
        //   `Updating visibility raycasts -- strategy: ${JSON.stringify(
        //     strategy
        //   )}, curEyePos: ${serializeVec3(curEyePos)}`
        // );
        if (strategy === "everywhere") {
            (0, assert_1.default)(this.hitsOrganizedIntoVoxelSpace.eyePosAtLastUpdate.equals(this.visibilityMask.eyePosAtLastUpdate));
            for (const raycastKey of this.raycasts.keys()) {
                this.removePreviousRaycastData(raycastKey);
            }
            // Once we've saved the previous eye position, we can update it
            this.hitsOrganizedIntoVoxelSpace.updateEyePosAndShiftAsNeeded(curEyePos);
            this.visibilityMask.updateEyePosAndShiftAsNeeded(curEyePos);
            for (const raycastKey of this.raycasts.keys()) {
                this.doRaycastAndStoreData(raycastKey, curEyePos);
            }
        }
        else {
            // We don't support partial raycast updates if the eye position has changed
            (0, assert_1.default)(curEyePos.equals(this.hitsOrganizedIntoVoxelSpace.eyePosAtLastUpdate));
            (0, assert_1.default)(curEyePos.equals(this.visibilityMask.eyePosAtLastUpdate));
            for (const raycastKey of this.getRaycastsAroundVoxel(strategy.forWorldVoxel, strategy.numSuroundingVoxelsRadius)) {
                this.removePreviousRaycastData(raycastKey);
                this.doRaycastAndStoreData(raycastKey, curEyePos);
            }
        }
    }
}
exports.VisibilityRaycastManager = VisibilityRaycastManager;

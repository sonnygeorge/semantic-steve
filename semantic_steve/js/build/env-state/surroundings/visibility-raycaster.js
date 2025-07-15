"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityRaycaster = void 0;
const assert_1 = __importDefault(require("assert"));
const vec3_1 = require("vec3");
const orientation_1 = require("../../utils/orientation");
const types_1 = require("../../types");
const voxel_1 = require("../../utils/voxel");
const generic_1 = require("../../utils/generic");
const array_1 = require("../../utils/array");
const prismarine_world_1 = require("prismarine-world");
const voxel_2 = require("../../utils/voxel");
const RELEASE_EVENT_LOOP_EVERY_N_MS = 80;
class VisibilityRaycaster {
    constructor(bot, radiusOfInterest) {
        this.isRaycasting = false;
        this.orientations = new Map();
        // Face<->cast orientation penetration mappings
        this.facesToCastOrientationsThatPenetrateThem = new Map();
        this.castOrientationsToPenetratedFaces = new Map();
        if (!Number.isInteger(radiusOfInterest) || radiusOfInterest <= 0) {
            throw new Error("radiusOfInterest must be a positive integer");
        }
        this.bot = bot;
        this.radius = radiusOfInterest;
        this.getOrientationsAndPenetrations();
        const arrayDimension = 2 * this.radius + 1; // To enclose the sphere of interest
        this.visibleBlocks = new array_1.OffsetBased3DArray(arrayDimension, null);
        this.visibilityMask = new array_1.OffsetBased3DArray(arrayDimension, false);
    }
    /**
     * Generates a list of in-radius voxel offsets sorted by distance from origin
     * @returns Array of Vec3 offsets
     */
    getDistanceSortedVoxelOffsets() {
        const voxelOffsets = [];
        for (let x = -this.radius; x <= this.radius; x++) {
            for (let y = -this.radius; y <= this.radius; y++) {
                for (let z = -this.radius; z <= this.radius; z++) {
                    // Skip zero vector and voxels outside radius
                    if (x === 0 && y === 0 && z === 0)
                        continue;
                    const distance = Math.sqrt(x * x + y * y + z * z);
                    if (distance < this.radius) {
                        voxelOffsets.push(new vec3_1.Vec3(x, y, z));
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
    getFacesPenetratedByCast(rayDirection) {
        const penetratedFaces = new Set();
        const maxDistance = this.radius + 0.5; // Slightly beyond sphere radius
        const rayOrigin = new vec3_1.Vec3(0.5, 0.5, 0.5); // Center of the origin voxel
        const raycastIterator = new prismarine_world_1.iterators.RaycastIterator(rayOrigin, rayDirection, maxDistance);
        let currentBlock = raycastIterator.next();
        while (currentBlock !== null) {
            // Skip the origin voxel (0,0,0)
            if (currentBlock.x !== 0 ||
                currentBlock.y !== 0 ||
                currentBlock.z !== 0) {
                const voxelPos = new vec3_1.Vec3(currentBlock.x, currentBlock.y, currentBlock.z);
                const faceKey = (0, voxel_1.serializeVoxelOffsetFace)(voxelPos, currentBlock.face);
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
    getOrientationsAndPenetrations() {
        const faceOffsets = [
            { offset: new vec3_1.Vec3(0.5, 0, 0), face: types_1.BlockFace.EAST }, // +X face
            { offset: new vec3_1.Vec3(-0.5, 0, 0), face: types_1.BlockFace.WEST }, // -X face
            { offset: new vec3_1.Vec3(0, 0.5, 0), face: types_1.BlockFace.TOP }, // +Y face
            { offset: new vec3_1.Vec3(0, -0.5, 0), face: types_1.BlockFace.BOTTOM }, // -Y face
            { offset: new vec3_1.Vec3(0, 0, 0.5), face: types_1.BlockFace.SOUTH }, // +Z face
            { offset: new vec3_1.Vec3(0, 0, -0.5), face: types_1.BlockFace.NORTH }, // -Z face
        ];
        this.orientations = new Map();
        this.castOrientationsToPenetratedFaces = new Map();
        this.facesToCastOrientationsThatPenetrateThem = new Map();
        const alreadyPenetrated = new Set();
        const voxelOffsets = this.getDistanceSortedVoxelOffsets();
        for (const voxelOffset of voxelOffsets) {
            for (const { offset: faceOffset, face } of faceOffsets) {
                const faceCenter = new vec3_1.Vec3(voxelOffset.x + faceOffset.x, voxelOffset.y + faceOffset.y, voxelOffset.z + faceOffset.z);
                const faceKey = (0, voxel_1.serializeVoxelOffsetFace)(voxelOffset, face);
                if (alreadyPenetrated.has(faceKey)) {
                    continue;
                }
                const orientation = new orientation_1.ThreeDimOrientation({
                    towards: faceCenter,
                });
                const orientationKey = orientation.serialize();
                this.orientations.set(orientationKey, orientation);
                const facesPenetratedByOrientation = this.getFacesPenetratedByCast(orientation.vecNorm);
                // Store this in th map of cast orientations to their penetrated faces
                this.castOrientationsToPenetratedFaces.set(orientationKey, facesPenetratedByOrientation);
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
                    .get(faceKey)
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
    doRaycast(from, direction, alreadyAscertainedVoxels) {
        const iter = new prismarine_world_1.iterators.RaycastIterator(from, direction, this.radius + 0.5);
        let pos = iter.next();
        let hit = null;
        while (pos) {
            const position = new vec3_1.Vec3(pos.x, pos.y, pos.z);
            const serializedPosition = (0, generic_1.serializeVec3)(position);
            const offset = position.floored().minus(from);
            if (hit && !alreadyAscertainedVoxels.has(serializedPosition)) {
                // This offset should be provisionally considered invisible.
                // "Provisionally" since we are not adding it to the set of already ascertained
                // voxels, meaning, the offset voxel can be hit later via a different entry face.
                this.visibleBlocks.unsetFromOffset(offset);
                this.visibilityMask.unsetFromOffset(offset);
            }
            else if (!hit && !alreadyAscertainedVoxels.has(serializedPosition)) {
                const block = this.bot.world.getBlock(position);
                // Any air/null that we hit is just an unobstructed (see-through) voxel
                if (block === null || block.name === "air") {
                    this.visibleBlocks.unsetFromOffset(offset); // No block at this offset
                    this.visibilityMask.setFromOffset(offset, true); // Rays pass through = visible
                }
                else {
                    // The first block has been reached by this raycast and is our hit!
                    this.visibleBlocks.setFromOffset(offset, block); // Add block to visible blocks
                    this.visibilityMask.setFromOffset(offset, true); // Mark offset as visible
                    hit = [block, pos.face];
                }
                alreadyAscertainedVoxels.add(serializedPosition); // Mark this voxel as checked
            }
            pos = iter.next();
        }
        return hit !== null && hit !== void 0 ? hit : [null, null];
    }
    /**
     * Performs raycasting with occlusion culling from a given voxel position.
     * @param fromVoxel - The voxel position to start raycasting from.
     * @returns An async generator yielding pairs of [direction, hitBlock] where
     *          `direction` is the direction vector of the raycast and `hitBlock`
     *          is the block hit by the raycast, or null if no block was hit.
     */
    doRaycasting(fromVoxel) {
        return __asyncGenerator(this, arguments, function* doRaycasting_1() {
            (0, assert_1.default)((0, voxel_2.isVoxel)(fromVoxel));
            let msElapsedWhileRaycasting = 0;
            const start = performance.now();
            let timeOfLastStart = start;
            // Variable setup
            this.isRaycasting = true;
            let nRaycastsPerformed = 0;
            const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
            const orientationsToSkip = new Set();
            const alreadyAscertainedVoxels = new Set();
            // Inner helper function to release event loop every N raycasts
            function releaseEventLoopIfNecessary() {
                return __awaiter(this, void 0, void 0, function* () {
                    const elapsedSinceLastStart = performance.now() - timeOfLastStart;
                    if (elapsedSinceLastStart > RELEASE_EVENT_LOOP_EVERY_N_MS) {
                        msElapsedWhileRaycasting += elapsedSinceLastStart;
                        yield (0, generic_1.asyncSleep)(0);
                        timeOfLastStart = performance.now();
                    }
                });
            }
            // Main raycasting loop
            for (const [originalRayOrientationKey, OriginalRayOrientation] of this
                .orientations) {
                if (orientationsToSkip.has(originalRayOrientationKey)) {
                    continue;
                }
                const [hit, face] = this.doRaycast(fromVoxelCenter, OriginalRayOrientation.vecNorm, alreadyAscertainedVoxels);
                nRaycastsPerformed++;
                yield yield __await([OriginalRayOrientation.vecNorm, hit]);
                yield __await(releaseEventLoopIfNecessary());
                // Once we've hit a face, we can skip the other orientations that penetrate this face
                if (hit && face) {
                    const hitBlockOffset = hit.position.minus(fromVoxel);
                    const faceKey = (0, voxel_1.serializeVoxelOffsetFace)(hitBlockOffset, face);
                    const castOrientationsThatPenetrateHitBlockFace = this.facesToCastOrientationsThatPenetrateThem.get(faceKey);
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
            console.log(`${msElapsedWhileRaycasting}ms spent raycasting | ` +
                `${totalMsElapsed - msElapsedWhileRaycasting}ms spent elsewhere`);
            this.isRaycasting = false;
        });
    }
}
exports.VisibilityRaycaster = VisibilityRaycaster;

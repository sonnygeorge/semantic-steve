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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityRaycaster = void 0;
const vec3_1 = require("vec3");
const orientation_1 = require("../../utils/orientation");
const types_1 = require("../../types");
const voxel_1 = require("../../utils/voxel");
const generic_1 = require("../../utils/generic");
const array_1 = require("../../utils/array");
const prismarine_world_1 = require("prismarine-world");
const voxel_2 = require("../../utils/voxel");
const RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS = 2000;
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
     * Performs a raycast from a given position in a specified direction and updates the
     * visibility mask and visible blocks as the raycast progresses.
     *
     * This is a simplified version of prismarine-world's raycasting that:
     * - Doesn't take into account the shapes of blocks. Here, unlike bot.world.raycast, any
     *   block in a voxel reached voxel is considered a hit, even if the ray would not have
     *   intersected with the block's shape (e.g., a slab).
     * - Adds our custom updating of the visibility mask and visible blocks arrays.
     *
     * @param from - The starting position of the raycast.
     * @param direction - The normalized direction vector of the raycast.
     * @param range - The maximum range of the raycast.
     * @returns A tuple containing the first block hit by the raycast and the face it hit,
     *          or null if no block was hit.
     */
    doRaycast(from, direction, range) {
        const iter = new prismarine_world_1.iterators.RaycastIterator(from, direction, range);
        let pos = iter.next();
        while (pos) {
            const position = new vec3_1.Vec3(pos.x, pos.y, pos.z);
            const block = this.bot.world.getBlock(position);
            const offset = position.floored().minus(from);
            if (block === null || block.name === "air") {
                // A ray passed through this voxel (is unobstructed from the bots eyes)
                this.visibilityMask.setFromOffset(offset, true);
                this.visibleBlocks.unsetFromOffset(offset);
            }
            else {
                this.visibilityMask.setFromOffset(offset, true); // Contents are technically visible
                this.visibleBlocks.unsetFromOffset(offset);
                return [block, pos.face];
            }
            pos = iter.next();
        }
        // Finally, the raycast iterator has reached the end of its range
        return [null, null];
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
            (0, voxel_2.assertIsVoxel)(fromVoxel);
            // Variable setup
            this.isRaycasting = true;
            const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
            const orientationsToSkip = new Set();
            const maxRaycastDistance = this.radius + 0.5; // Slightly beyond sphere radius to ensure coverage
            // Inner helper function to release event every N raycasts
            let nRaycastsPerformed = 0;
            function releaseEventLoopIfNecessary() {
                return __awaiter(this, void 0, void 0, function* () {
                    nRaycastsPerformed++;
                    if (nRaycastsPerformed % RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS === 0) {
                        yield (0, generic_1.asyncSleep)(0);
                    }
                });
            }
            // Main raycasting loop
            for (const [originalRayOrientationKey, OriginalRayOrientation] of this
                .orientations) {
                if (orientationsToSkip.has(originalRayOrientationKey)) {
                    continue;
                }
                const [hit, face] = this.doRaycast(fromVoxelCenter, OriginalRayOrientation.vecNorm, maxRaycastDistance);
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
            this.isRaycasting = false;
        });
    }
}
exports.VisibilityRaycaster = VisibilityRaycaster;

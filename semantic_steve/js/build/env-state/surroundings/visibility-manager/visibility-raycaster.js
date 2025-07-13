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
const types_1 = require("./types");
const generic_1 = require("../../../utils/generic");
const generic_2 = require("../../../utils/generic");
const prismarine_world_1 = require("prismarine-world");
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
    }
    /**
     * Helper function to serialize a face consistently
     * Uses the voxel that the face is the bottom, north, or west face of
     * @returns A string in the format "${serializeVec3(voxelOffset)},${BlockFace}"
     */
    serializeFace(voxelPos, face) {
        let canonicalVoxel;
        switch (face) {
            case types_1.BlockFace.BOTTOM:
            case types_1.BlockFace.TOP:
                // For vertical faces, use the lower voxel (smaller Y)
                canonicalVoxel =
                    face === types_1.BlockFace.BOTTOM
                        ? new vec3_1.Vec3(voxelPos.x, voxelPos.y - 1, voxelPos.z)
                        : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
                return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.BlockFace.BOTTOM}`;
            case types_1.BlockFace.NORTH:
            case types_1.BlockFace.SOUTH:
                // For north-south faces, use the northern voxel (smaller Z)
                canonicalVoxel =
                    face === types_1.BlockFace.NORTH
                        ? new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z - 1)
                        : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
                return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.BlockFace.NORTH}`;
            case types_1.BlockFace.WEST:
            case types_1.BlockFace.EAST:
                // For east-west faces, use the western voxel (smaller X)
                canonicalVoxel =
                    face === types_1.BlockFace.WEST
                        ? new vec3_1.Vec3(voxelPos.x - 1, voxelPos.y, voxelPos.z)
                        : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
                return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.BlockFace.WEST}`;
            default:
                throw new Error(`Unknown face: ${face}`);
        }
    }
    /**
     * Generates a list of in-radius voxel offsets sorted by distance from origin
     * @returns Array of Vec3 offsets
     */
    getInRadiusOffsetsSortedByDistance() {
        const voxelOffsets = [];
        // Generate all voxel offsets within radius
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
    getOrientationsAndPenetrations() {
        this.orientations = new Map();
        this.castOrientationsToPenetratedFaces = new Map();
        this.facesToCastOrientationsThatPenetrateThem = new Map();
        const alreadyPenetrated = new Set();
        const voxelOffsets = this.getInRadiusOffsetsSortedByDistance();
        // Face offsets: each face center is 0.5 units away from voxel center in one direction
        const faceOffsets = [
            { offset: new vec3_1.Vec3(0.5, 0, 0), face: types_1.BlockFace.EAST }, // +X face
            { offset: new vec3_1.Vec3(-0.5, 0, 0), face: types_1.BlockFace.WEST }, // -X face
            { offset: new vec3_1.Vec3(0, 0.5, 0), face: types_1.BlockFace.TOP }, // +Y face
            { offset: new vec3_1.Vec3(0, -0.5, 0), face: types_1.BlockFace.BOTTOM }, // -Y face
            { offset: new vec3_1.Vec3(0, 0, 0.5), face: types_1.BlockFace.SOUTH }, // +Z face
            { offset: new vec3_1.Vec3(0, 0, -0.5), face: types_1.BlockFace.NORTH }, // -Z face
        ];
        // Process voxels in order from closest to furthest
        for (const voxelOffset of voxelOffsets) {
            // Generate orientations for all 6 faces of this voxel
            for (const { offset: faceOffset, face } of faceOffsets) {
                const faceCenter = new vec3_1.Vec3(voxelOffset.x + faceOffset.x, voxelOffset.y + faceOffset.y, voxelOffset.z + faceOffset.z);
                // Create the face identifier for this face
                const faceKey = this.serializeFace(voxelOffset, face);
                // Skip if this face has already been penetrated by a previous raycast
                if (alreadyPenetrated.has(faceKey)) {
                    continue;
                }
                // Create orientation pointing to this face
                const orientation = new types_1.ThreeDimOrientation({
                    towards: faceCenter,
                });
                const orientationKey = orientation.serialize();
                // Store the orientation
                this.orientations.set(orientationKey, orientation);
                // Calculate which faces this raycast penetrates
                const penetratedFaces = this.getFacesPenetratedByCast(orientation.vecNorm);
                // Store the forward mapping (orientation -> faces)
                this.castOrientationsToPenetratedFaces.set(orientationKey, penetratedFaces);
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
                    .get(faceKey)
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
    doRaycasting(fromVoxel) {
        return __asyncGenerator(this, arguments, function* doRaycasting_1() {
            if (!Number.isInteger(fromVoxel.x) ||
                !Number.isInteger(fromVoxel.y) ||
                !Number.isInteger(fromVoxel.z)) {
                throw new Error("Only raycasting from a voxel (int coords) is supported");
            }
            // Setup variables
            this.isRaycasting = true;
            const fromVoxelCenter = fromVoxel.offset(0.5, 0.5, 0.5);
            const orientationsToSkip = new Set();
            const maxRaycastDistance = this.radius + 0.5; // Slightly beyond sphere radius to ensure coverage
            let nRaycastsPerformed = 0;
            // Inner helper functions
            function releaseEventLoopIfNecessary() {
                return __awaiter(this, void 0, void 0, function* () {
                    nRaycastsPerformed++;
                    if (nRaycastsPerformed % RELEASE_EVENT_LOOP_EVERY_N_RAYCASTS === 0) {
                        yield (0, generic_2.asyncSleep)(0);
                    }
                });
            }
            const doRaycast = (from, direction, range) => {
                const iter = new prismarine_world_1.iterators.RaycastIterator(from, direction, range);
                let pos = iter.next();
                while (pos) {
                    const position = new vec3_1.Vec3(pos.x, pos.y, pos.z);
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
                const [hit, face] = doRaycast(fromVoxelCenter, OriginalRayOrientation.vecNorm, maxRaycastDistance);
                yield yield __await([OriginalRayOrientation.vecNorm, hit]);
                yield __await(releaseEventLoopIfNecessary());
                if (hit && face) {
                    const hitBlockOffset = hit.position.minus(fromVoxel);
                    const faceKey = this.serializeFace(hitBlockOffset, face);
                    const castOrientationsThatPenetrateHitBlockFace = this.facesToCastOrientationsThatPenetrateThem.get(faceKey);
                    if (castOrientationsThatPenetrateHitBlockFace &&
                        castOrientationsThatPenetrateHitBlockFace.size - 1 > 4) {
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
        });
    }
}
exports.VisibilityRaycaster = VisibilityRaycaster;

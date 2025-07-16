"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoxelAroundBot = exports.VoxelFaceAroundBot = void 0;
exports.isVoxel = isVoxel;
exports.serializeVoxelOffsetFace = serializeVoxelOffsetFace;
const assert_1 = __importDefault(require("assert"));
const vec3_1 = require("vec3");
const constants_1 = require("../constants");
const types_1 = require("../types");
const generic_1 = require("./generic");
function isVoxel(vec) {
    return (Number.isInteger(vec.x) &&
        Number.isInteger(vec.y) &&
        Number.isInteger(vec.z));
}
/**
 * Helper function to serialize a face consistently
 * Uses the voxel that the face is the bottom, north, or west face of
 *
 * @returns A string in the format "${serializeVec3(voxelOffset)},${BlockFace}"
 */
function serializeVoxelOffsetFace(voxelPos, face) {
    let canonicalVoxel;
    switch (face) {
        case types_1.VoxelFace.BOTTOM:
        case types_1.VoxelFace.TOP:
            // For vertical faces, use the lower voxel (smaller Y)
            canonicalVoxel =
                face === types_1.VoxelFace.BOTTOM
                    ? new vec3_1.Vec3(voxelPos.x, voxelPos.y - 1, voxelPos.z)
                    : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
            return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.VoxelFace.BOTTOM}`;
        case types_1.VoxelFace.NORTH:
        case types_1.VoxelFace.SOUTH:
            // For north-south faces, use the northern voxel (smaller Z)
            canonicalVoxel =
                face === types_1.VoxelFace.NORTH
                    ? new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z - 1)
                    : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
            return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.VoxelFace.NORTH}`;
        case types_1.VoxelFace.WEST:
        case types_1.VoxelFace.EAST:
            // For east-west faces, use the western voxel (smaller X)
            canonicalVoxel =
                face === types_1.VoxelFace.WEST
                    ? new vec3_1.Vec3(voxelPos.x - 1, voxelPos.y, voxelPos.z)
                    : new vec3_1.Vec3(voxelPos.x, voxelPos.y, voxelPos.z);
            return `${(0, generic_1.serializeVec3)(canonicalVoxel)},${types_1.VoxelFace.WEST}`;
        default:
            throw new Error(`Unknown face: ${face}`);
    }
}
class VoxelFaceAroundBot {
    constructor(bot, c1, c2, c3, c4) {
        for (const corner of [c1, c2, c3, c4]) {
            (0, assert_1.default)(isVoxel(corner));
        }
        this.bot = bot;
        this.corners = [c1, c2, c3, c4];
    }
    getCenter() {
        const [c1, c2, c3, c4] = this.corners;
        return new vec3_1.Vec3((c1.x + c2.x + c3.x + c4.x) / 4, (c1.y + c2.y + c3.y + c4.y) / 4, (c1.z + c2.z + c3.z + c4.z) / 4);
    }
    isWithinReachForPlacement() {
        const center = this.getCenter();
        const distance = this.bot.entity.position.distanceTo(center);
        return distance <= constants_1.MAX_PLACEMENT_REACH;
    }
}
exports.VoxelFaceAroundBot = VoxelFaceAroundBot;
class VoxelAroundBot {
    constructor(bot, coords) {
        (0, assert_1.default)(isVoxel(coords));
        this.bot = bot;
        this.coords = coords;
        this.faces = this.createFaces();
    }
    createFaces() {
        const x = this.coords.x;
        const y = this.coords.y;
        const z = this.coords.z;
        const corners = [
            new vec3_1.Vec3(x, y, z), // 0: bottom, north, west
            new vec3_1.Vec3(x + 1, y, z), // 1: bottom, north, east
            new vec3_1.Vec3(x + 1, y, z + 1), // 2: bottom, south, east
            new vec3_1.Vec3(x, y, z + 1), // 3: bottom, south, west
            new vec3_1.Vec3(x, y + 1, z), // 4: top, north, west
            new vec3_1.Vec3(x + 1, y + 1, z), // 5: top, north, east
            new vec3_1.Vec3(x + 1, y + 1, z + 1), // 6: top, south, east
            new vec3_1.Vec3(x, y + 1, z + 1), // 7: top, south, west
        ];
        const sideToFaceMapping = [
            [
                types_1.VoxelFace.WEST,
                new VoxelFaceAroundBot(this.bot, corners[0], corners[3], corners[7], corners[4]),
            ],
            [
                types_1.VoxelFace.EAST,
                new VoxelFaceAroundBot(this.bot, corners[1], corners[5], corners[6], corners[2]),
            ],
            [
                types_1.VoxelFace.BOTTOM,
                new VoxelFaceAroundBot(this.bot, corners[0], corners[1], corners[2], corners[3]),
            ],
            [
                types_1.VoxelFace.TOP,
                new VoxelFaceAroundBot(this.bot, corners[4], corners[7], corners[6], corners[5]),
            ],
            [
                types_1.VoxelFace.NORTH,
                new VoxelFaceAroundBot(this.bot, corners[0], corners[4], corners[5], corners[1]),
            ],
            [
                types_1.VoxelFace.SOUTH,
                new VoxelFaceAroundBot(this.bot, corners[3], corners[2], corners[6], corners[7]),
            ],
        ];
        const facesMap = new Map();
        for (const [side, face] of sideToFaceMapping) {
            facesMap.set(side, face);
        }
        return facesMap;
    }
    getThreeClosestFaces() {
        const faceDistances = [];
        for (const [side, face] of this.faces) {
            const center = face.getCenter();
            const distance = this.bot.entity.position.distanceTo(center);
            faceDistances.push({ side, distance });
        }
        faceDistances.sort((a, b) => a.distance - b.distance);
        const closestFaces = new Map();
        for (let i = 0; i < 3; i++) {
            const { side } = faceDistances[i];
            closestFaces.set(side, this.faces.get(side));
        }
        return closestFaces;
    }
}
exports.VoxelAroundBot = VoxelAroundBot;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CubedMeter = exports.CubedMeterFace = void 0;
const vec3_1 = require("vec3");
const types_1 = require("../types");
const constants_1 = require("../constants");
/**
 * Represents a face connecting two adjacent cubed meters in the Minecraft world.
 */
class CubedMeterFace {
    constructor(bot, c1, c2, c3, c4) {
        for (const corner of [c1, c2, c3, c4]) {
            if (!Number.isInteger(corner.x) ||
                !Number.isInteger(corner.y) ||
                !Number.isInteger(corner.z)) {
                throw new Error("All corner coordinates must be integers");
            }
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
exports.CubedMeterFace = CubedMeterFace;
/**
 * Represents a cubic meter in the Minecraft world, with connections to its adjacent blocks.
 */
class CubedMeter {
    constructor(bot, coords) {
        if (!Number.isInteger(coords.x) ||
            !Number.isInteger(coords.y) ||
            !Number.isInteger(coords.z)) {
            throw new Error("Cubed meter coords must be integers");
        }
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
                types_1.ConnectingSide.WEST,
                new CubedMeterFace(this.bot, corners[0], corners[3], corners[7], corners[4]),
            ],
            [
                types_1.ConnectingSide.EAST,
                new CubedMeterFace(this.bot, corners[1], corners[5], corners[6], corners[2]),
            ],
            [
                types_1.ConnectingSide.BOTTOM,
                new CubedMeterFace(this.bot, corners[0], corners[1], corners[2], corners[3]),
            ],
            [
                types_1.ConnectingSide.TOP,
                new CubedMeterFace(this.bot, corners[4], corners[7], corners[6], corners[5]),
            ],
            [
                types_1.ConnectingSide.NORTH,
                new CubedMeterFace(this.bot, corners[0], corners[4], corners[5], corners[1]),
            ],
            [
                types_1.ConnectingSide.SOUTH,
                new CubedMeterFace(this.bot, corners[3], corners[2], corners[6], corners[7]),
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
exports.CubedMeter = CubedMeter;

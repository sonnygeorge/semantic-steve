"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeDimensionalOrientation = exports.Symmetrical3DArray = exports.asyncSleep = void 0;
exports.isValidEmail = isValidEmail;
exports.bilinearInterpolate = bilinearInterpolate;
exports.serializeVec3 = serializeVec3;
exports.deserializeVec3 = deserializeVec3;
exports.generateUniformlyDistributed3DOrientations = generateUniformlyDistributed3DOrientations;
const vec3_1 = require("vec3");
const asyncSleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.asyncSleep = asyncSleep;
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
class Symmetrical3DArray {
    constructor(dimension, defaultValue) {
        this.idxsWithSetValues = new Map();
        this.defaultValue = defaultValue;
        const defaultFactory = typeof defaultValue === "function"
            ? defaultValue
            : () => defaultValue;
        this.array = Array.from({ length: dimension }, () => Array.from({ length: dimension }, () => Array.from({ length: dimension }, () => defaultFactory())));
    }
    serializeIdx(x, y, z) {
        return `${x},${y},${z}`;
    }
    deserializeIdx(key) {
        const parts = key.split(",");
        return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
    }
    get(x, y, z) {
        try {
            return this.array[x][y][z];
        }
        catch (_a) {
            console.log("crap");
            return this.array[x][y][z];
        }
    }
    set(x, y, z, value) {
        this.array[x][y][z] = value;
        this.idxsWithSetValues.set(this.serializeIdx(x, y, z), [x, y, z]);
    }
    unset(x, y, z) {
        const defaultFactory = typeof this.defaultValue === "function"
            ? this.defaultValue
            : () => this.defaultValue;
        this.array[x][y][z] = defaultFactory();
        this.idxsWithSetValues.delete(this.serializeIdx(x, y, z));
    }
}
exports.Symmetrical3DArray = Symmetrical3DArray;
/**
 * Calculates a point on a quadrilateral face using bilinear interpolation.
 * P = (1-u)(1-v)P₁ + u(1-v)P₂ + (1-u)vP₃ + uvP₄
 *
 * @param u - Normalized u-coordinate [0,1]
 * @param v - Normalized v-coordinate [0,1]
 * @param c1 - First corner of the quadrilateral
 * @param c2 - Second corner of the quadrilateral
 * @param c3 - Third corner of the quadrilateral
 * @param c4 - Fourth corner of the quadrilateral
 * @returns Interpolated point
 */
function bilinearInterpolate(u, v, c1, c2, c3, c4) {
    function interpolateComponent(component) {
        // Term 1: (1-u)(1-v)P₁ - Bottom-left corner contribution
        const term1 = (1 - u) * (1 - v) * c1[component];
        // Term 2: u(1-v)P₂ - Bottom-right corner contribution
        const term2 = u * (1 - v) * c2[component];
        // Term 3: (1-u)vP₃ - Top-left corner contribution
        const term3 = (1 - u) * v * c3[component];
        // Term 4: uvP₄ - Top-right corner contribution
        const term4 = u * v * c4[component];
        // Sum all four terms to get the interpolated component
        return term1 + term2 + term3 + term4;
    }
    return new vec3_1.Vec3(interpolateComponent("x"), interpolateComponent("y"), interpolateComponent("z"));
}
function serializeVec3(vec) {
    return `${vec.x},${vec.y},${vec.z}`;
}
function deserializeVec3(str) {
    const [x, y, z] = str.split(",").map(Number);
    return new vec3_1.Vec3(x, y, z);
}
class ThreeDimensionalOrientation {
    constructor(params) {
        if (params instanceof vec3_1.Vec3) {
            this.directionVector = params.normalize();
            this.horizontalAngle = Math.atan2(this.directionVector.x, this.directionVector.z);
            this.verticalAngle = Math.asin(this.directionVector.y);
        }
        else if ("horizontalAngle" in params && "verticalAngle" in params) {
            this.horizontalAngle = params.horizontalAngle;
            this.verticalAngle = params.verticalAngle;
            this.directionVector = new vec3_1.Vec3(Math.sin(this.horizontalAngle) * Math.cos(this.verticalAngle), Math.sin(this.verticalAngle), Math.cos(this.horizontalAngle) * Math.cos(this.verticalAngle)).normalize();
        }
        else {
            const { x, y, z } = params.towards;
            this.horizontalAngle = Math.atan2(x, z);
            const horizontalDistance = Math.sqrt(x * x + z * z);
            this.verticalAngle = Math.atan2(y, horizontalDistance);
            this.directionVector = new vec3_1.Vec3(Math.sin(this.horizontalAngle) * Math.cos(this.verticalAngle), Math.sin(this.verticalAngle), Math.cos(this.horizontalAngle) * Math.cos(this.verticalAngle)).normalize();
        }
    }
    serialize() {
        return `${this.horizontalAngle.toFixed(4)},${this.verticalAngle.toFixed(4)}`;
    }
}
exports.ThreeDimensionalOrientation = ThreeDimensionalOrientation;
/**
 * Generates uniformly distributed orientations across the 3D sphere
 * using the Fibonacci spiral method for optimal uniform distribution.
 */
function* generateUniformlyDistributed3DOrientations(numOrientations) {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
    for (let i = 0; i < numOrientations; i++) {
        // Fibonacci spiral method for uniform sphere distribution
        const y = 1 - (2 * i) / (numOrientations - 1); // y goes from 1 to -1
        const radius = Math.sqrt(1 - y * y); // radius at y
        const theta = goldenAngle * i; // golden angle increment
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        yield new ThreeDimensionalOrientation({
            towards: { x, y, z },
        });
    }
}

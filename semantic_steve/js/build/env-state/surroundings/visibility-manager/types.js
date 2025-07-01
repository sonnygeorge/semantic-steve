"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeDimOrientation = void 0;
const vec3_1 = require("vec3");
/**
 * Represents spherical coordinates using mathematical convention.
 * @remarks Angles are in radians. Theta is the azimuthal angle (horizontal) in the xy-plane,
 * where 0 points along the positive x-axis. Phi is the polar angle (vertical) from the
 * positive z-axis, where 0 is straight upward and π is straight downward.
 */
class SphericalAngles {
    /**
     * Creates a new SphericalAngles instance.
     * @param theta - Azimuthal angle in radians, must be in [0, 2π).
     * @param phi - Polar angle in radians, must be in [0, π].
     * @throws Error if theta is not in [0, 2π) or phi is not in [0, π].
     */
    constructor(theta, phi) {
        if (theta < 0 || theta >= 2 * Math.PI) {
            throw new Error("Theta must be in the range [0, 2π)");
        }
        if (phi < 0 || phi > Math.PI) {
            throw new Error("Phi must be in the range [0, π]");
        }
        this.theta = theta;
        this.phi = phi;
    }
}
/**
 * Represents a 3D orientation using spherical angles or a normalized vector.
 * @remarks Can be initialized with a vector, spherical angles, or a target vector to point towards.
 * Provides access to both spherical angles (theta, phi) and a normalized 3D vector.
 * Uses mathematical spherical coordinate convention: theta = azimuthal (horizontal), phi = polar (vertical).
 */
class ThreeDimOrientation {
    /**
     * Creates a new 3D orientation.
     * @param params - Input as a Vec3 (direction vector), SphericalAngles (theta, phi), or an object with a `towards` Vec3.
     */
    constructor(params) {
        if (params instanceof vec3_1.Vec3) {
            this._input = { kind: "vector", value: params };
        }
        else if ("theta" in params && "phi" in params) {
            this._input = {
                kind: "angles",
                angles: new SphericalAngles(params.theta, params.phi),
            };
        }
        else {
            this._input = { kind: "towards", value: params.towards };
        }
    }
    /**
     * Gets the normalized 3D vector representing the orientation.
     * @returns A normalized Vec3.
     */
    get vecNorm() {
        if (!this._vecNorm) {
            switch (this._input.kind) {
                case "vector":
                    this._vecNorm = this._input.value.normalize();
                    break;
                case "towards":
                    this._vecNorm = this._input.value.normalize();
                    break;
                case "angles":
                    // Mathematical spherical to Cartesian conversion:
                    // x = sin(phi) * cos(theta)
                    // y = sin(phi) * sin(theta)
                    // z = cos(phi)
                    this._vecNorm = new vec3_1.Vec3(Math.sin(this._input.angles.phi) *
                        Math.cos(this._input.angles.theta), Math.sin(this._input.angles.phi) *
                        Math.sin(this._input.angles.theta), Math.cos(this._input.angles.phi)).normalize();
                    break;
            }
        }
        return this._vecNorm;
    }
    /**
     * Gets the spherical angles (theta, phi) representing the orientation.
     * @returns A SphericalAngles object with theta in [0, 2π) and phi in [0, π].
     * @remarks Theta is the azimuthal angle in the xy-plane; phi is the polar angle from the positive z-axis (0 = upward, π = downward).
     */
    get sphericalAngles() {
        if (!this._sphericalAngles) {
            if (this._input.kind === "angles") {
                this._sphericalAngles = new SphericalAngles(this._input.angles.theta, this._input.angles.phi);
            }
            else {
                const vec = this.vecNorm;
                // Handle edge cases for degenerate vectors
                if (vec.x === 0 && vec.y === 0 && vec.z === 0) {
                    throw new Error("Cannot compute spherical angles for zero vector");
                }
                // Compute phi (polar angle, angle from z-axis)
                // Clamp to handle floating point precision issues
                const cosPhiRaw = vec.z;
                const cosPhi = Math.max(-1, Math.min(1, cosPhiRaw));
                const phi = Math.acos(cosPhi);
                // Compute theta (azimuthal angle, angle in xy-plane)
                let theta = Math.atan2(vec.y, vec.x);
                // Normalize theta to [0, 2π) range
                if (theta < 0) {
                    theta += 2 * Math.PI;
                }
                this._sphericalAngles = new SphericalAngles(theta, phi);
            }
        }
        return this._sphericalAngles;
    }
    /**
     * Calculates the angular distance to another orientation on the unit sphere.
     * @param other - The other orientation to measure distance to.
     * @returns Angular distance in radians (0 to π).
     * @remarks Uses the dot product method for numerical stability and proper handling of angle wraparound.
     */
    distanceTo(other) {
        // Use normalized vectors for dot product calculation
        // This avoids issues with angle wraparound and is numerically stable
        const vec1 = this.vecNorm;
        const vec2 = other.vecNorm;
        // Dot product gives us cos(angular_distance)
        const dotProduct = vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
        // Clamp to handle floating point precision issues
        const clampedDot = Math.max(-1, Math.min(1, dotProduct));
        return Math.acos(clampedDot);
    }
    /**
     * Serializes the orientation to a string.
     * @returns A string in the format "theta,phi"
     */
    serialize() {
        const { theta, phi } = this.sphericalAngles;
        return `${theta},${phi}`;
    }
    /**
     * Deserializes a string to create a ThreeDimOrientation.
     * @param serialized - A string in the format "theta,phi".
     * @returns A new ThreeDimOrientation instance.
     */
    static deserialize(serialized) {
        const [theta, phi] = serialized.split(",").map(Number);
        if (isNaN(theta) || isNaN(phi)) {
            throw new Error("Invalid serialized orientation string");
        }
        return new ThreeDimOrientation(new SphericalAngles(theta, phi));
    }
}
exports.ThreeDimOrientation = ThreeDimOrientation;

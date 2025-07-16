"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeDimOrientation = void 0;
const vec3_1 = require("vec3");
/**
 * Represents spherical coordinates using Y-up coordinate system (Minecraft convention).
 * @remarks Angles are in radians. This class uses Y-up coordinates to match Minecraft's
 * coordinate system where Y is the vertical axis (up/down), X is east/west, and Z is north/south.
 *
 * Theta is the azimuthal angle (horizontal rotation) in the XZ-plane, where 0 points along
 * the positive X-axis (east). Phi is the polar angle (vertical) from the positive Y-axis,
 * where 0 is straight upward (+Y) and π is straight downward (-Y).
 */
class SphericalAngles {
    /**
     * Creates a new SphericalAngles instance.
     * @param phi - Polar angle in radians, must be in [0, π].
     * @param theta - Azimuthal angle in radians, must be in [0, 2π).
     * @throws Error if theta is not in [0, 2π) or phi is not in [0, π].
     */
    constructor(phi, theta) {
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
 * @remarks Uses Y-up coordinate system to match Minecraft conventions:
 * - X-axis: East/West (positive X = east)
 * - Y-axis: Up/Down (positive Y = up)
 * - Z-axis: North/South (positive Z = south)
 *
 * Can be initialized with a vector, spherical angles, or a target vector to point towards.
 * Provides access to both spherical angles (phi, theta) and a normalized 3D vector.
 *
 * Spherical coordinate convention:
 * - theta = azimuthal angle (horizontal rotation in XZ-plane)
 * - phi = polar angle (vertical angle from +Y axis)
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
                angles: new SphericalAngles(params.phi, params.theta),
            };
        }
        else {
            this._input = { kind: "towards", value: params.towards.clone() };
        }
    }
    /**
     * Gets the normalized 3D vector representing the orientation.
     * @returns A normalized Vec3 in Minecraft coordinate system (Y-up).
     * @remarks Vector components correspond to:
     * - X: East/West direction (positive = east)
     * - Y: Up/Down direction (positive = up)
     * - Z: North/South direction (positive = south)
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
                    this._vecNorm = new vec3_1.Vec3(Math.sin(this._input.angles.phi) *
                        Math.cos(this._input.angles.theta), // X (east/west)
                    Math.cos(this._input.angles.phi), // Y (up/down)
                    Math.sin(this._input.angles.phi) *
                        Math.sin(this._input.angles.theta)).normalize();
                    break;
            }
        }
        return this._vecNorm;
    }
    /**
     * Gets the spherical angles (phi, theta) representing the orientation.
     * @returns A SphericalAngles object with theta in [0, 2π) and phi in [0, π].
     * @remarks Uses Minecraft/Y-up coordinate system: theta is azimuthal angle in xz-plane;
     * phi is polar angle from positive y-axis (0 = upward, π = downward).
     */
    get sphericalAngles() {
        if (!this._sphericalAngles) {
            if (this._input.kind === "angles") {
                this._sphericalAngles = new SphericalAngles(this._input.angles.phi, this._input.angles.theta);
            }
            else {
                const vec = this.vecNorm;
                // Handle edge cases for degenerate vectors
                if (vec.x === 0 && vec.y === 0 && vec.z === 0) {
                    throw new Error("Cannot compute spherical angles for zero vector");
                }
                // Compute phi (polar angle, angle from Y-axis for Y-up system)
                // Clamp to handle floating point precision issues
                const cosPhiRaw = vec.y; // ✅ Fixed: Use Y component for Y-up system
                const cosPhi = Math.max(-1, Math.min(1, cosPhiRaw));
                const phi = Math.acos(cosPhi);
                // Compute theta (azimuthal angle, angle in XZ-plane for Y-up system)
                let theta = Math.atan2(vec.z, vec.x); // ✅ Fixed: Use Z,X for XZ-plane
                // Normalize theta to [0, 2π) range
                if (theta < 0) {
                    theta += 2 * Math.PI;
                }
                this._sphericalAngles = new SphericalAngles(phi, theta);
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
    angularDistanceTo(other) {
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
     * Generates orientations at a fixed angular distance in cardinal directions.
     * @param angularRadius - Angular distance in radians from the base orientation
     * @yields ThreeDimOrientation objects offset in +/-theta and +/-phi directions
     * @remarks Uses proper spherical geometry to ensure exact angular distances.
     * The offsets are applied using the plusAngularOffset method.
     */
    *getCardinalOffsets(angularRadius) {
        // Create 4 offset directions
        const angularOffsets = [
            { theta: angularRadius, phi: 0 },
            { theta: -angularRadius, phi: 0 },
            { theta: 0, phi: angularRadius },
            { theta: 0, phi: -angularRadius },
        ];
        for (const angularOffset of angularOffsets) {
            yield this.plusAngularOffset(angularOffset);
        }
    }
    /**
     * Creates a new orientation offset by the given angular amounts.
     * @param angularOffset - Spherical angle offsets to apply
     * @returns New ThreeDimOrientation with the offset applied
     * @remarks Uses proper spherical geometry rather than simple angle addition.
     * This method ensures the offset represents a true angular distance on the sphere.
     */
    plusAngularOffset(angularOffset) {
        const baseVec = this.vecNorm;
        // Calculate the magnitude of the offset
        const offsetMagnitude = Math.sqrt(angularOffset.theta * angularOffset.theta +
            angularOffset.phi * angularOffset.phi);
        if (offsetMagnitude === 0) {
            return new ThreeDimOrientation(baseVec);
        }
        // Create local coordinate system at the base orientation
        const up = new vec3_1.Vec3(0, 1, 0); // Y-up reference
        let thetaDirection;
        let phiDirection;
        // Handle special case when base vector is parallel to Y axis
        if (Math.abs(baseVec.y) > 0.999) {
            thetaDirection = new vec3_1.Vec3(1, 0, 0);
            phiDirection = new vec3_1.Vec3(0, 0, 1);
        }
        else {
            // General case: create orthonormal basis
            thetaDirection = baseVec.cross(up).normalize();
            phiDirection = baseVec.cross(thetaDirection).normalize();
        }
        // Apply the offset using rotation in 3D space
        const thetaComponent = thetaDirection.scale((angularOffset.theta * Math.sin(offsetMagnitude)) / offsetMagnitude);
        const phiComponent = phiDirection.scale((angularOffset.phi * Math.sin(offsetMagnitude)) / offsetMagnitude);
        const radialComponent = baseVec.scale(Math.cos(offsetMagnitude));
        const offsetVec = radialComponent
            .add(thetaComponent)
            .add(phiComponent)
            .normalize();
        return new ThreeDimOrientation(offsetVec);
    }
    /**
     * Serializes the orientation to a string.
     * @returns A string in the format "theta,phi"
     */
    serialize() {
        const { theta, phi } = this.sphericalAngles;
        return `${theta.toFixed(6)},${phi.toFixed(6)}`;
    }
    /**
     * Deserializes a string to create a ThreeDimOrientation.
     * @param serialized - The serialized ThreeDimOrientation
     * @returns A new ThreeDimOrientation instance
     */
    static deserialize(serialized) {
        const [theta, phi] = serialized.split(",").map(Number);
        if (isNaN(theta) || isNaN(phi)) {
            throw new Error("Invalid serialized orientation string");
        }
        return new ThreeDimOrientation(new SphericalAngles(phi, theta));
    }
}
exports.ThreeDimOrientation = ThreeDimOrientation;

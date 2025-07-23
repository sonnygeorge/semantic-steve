"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SphereSurfaceHash = void 0;
const vec3_1 = require("vec3");
const types_1 = require("./types");
const generic_1 = require("../../../utils/generic");
const TARGET_VOXELS_PER_CELL = 3;
function getMapOfOrientationsToSphereSurfaceVoxels(sphereRadius) {
    if (!Number.isInteger(sphereRadius) || sphereRadius <= 0) {
        throw new Error("sphereRadius must be a positive integer");
    }
    const orientationsToSurfaceVoxels = new Map();
    const orientations = new Map();
    const visited = new Set();
    const range = Math.ceil(sphereRadius + 1);
    for (let x = -range; x <= range; x++) {
        for (let y = -range; y <= range; y++) {
            for (let z = -range; z <= range; z++) {
                const voxelOffset = new vec3_1.Vec3(x, y, z);
                const voxelOffsetString = (0, generic_1.serializeVec3)(voxelOffset);
                const distanceToVoxel = Math.sqrt(x * x + y * y + z * z);
                if (Math.abs(distanceToVoxel - sphereRadius) <= 0.5) {
                    // Skip zero vector to avoid degenerate cases
                    if (x === 0 && y === 0 && z === 0)
                        continue;
                    const orientation = new types_1.ThreeDimOrientation({ towards: voxelOffset });
                    if (!visited.has(voxelOffsetString)) {
                        const key = orientation.serialize();
                        orientationsToSurfaceVoxels.set(key, voxelOffset);
                        orientations.set(key, orientation);
                        visited.add(voxelOffsetString);
                    }
                }
            }
        }
    }
    return [orientationsToSurfaceVoxels, orientations];
}
class SphereSurfaceHash {
    constructor(sphereRadius) {
        this.gridNeighbors = new Map();
        this.grid = new Map();
        this.orientationsToGridRegions = new Map();
        this.voxelsToOccludedRegions = new Map();
        this.voxelsToOcclusionRadii = new Map();
        [this.orientationsToSurfaceVoxels, this.orientations] =
            getMapOfOrientationsToSphereSurfaceVoxels(sphereRadius);
        this.config = this.calculateOptimalConfig(this.orientations.size);
        this.avgNumOrientationsPerRegion = this.buildSpatialHashGrid();
        this.buildGridNeighbors();
        this.calculateOcclusionData();
    }
    get maxThetaIdx() {
        if (this._maxThetaIdx === undefined) {
            this._maxThetaIdx =
                Math.floor((2 * Math.PI) / this.config.thetaStepSize) - 1;
        }
        return this._maxThetaIdx;
    }
    get maxPhiIdx() {
        if (this._maxPhiIdx === undefined) {
            this._maxPhiIdx = Math.floor(Math.PI / this.config.phiStepSize) - 1;
        }
        return this._maxPhiIdx;
    }
    calculateOptimalConfig(voxelCount) {
        // Ensure we have a reasonable minimum number of cells
        let targetCellCount = Math.floor(voxelCount / TARGET_VOXELS_PER_CELL);
        targetCellCount = Math.max(1, targetCellCount);
        // For a sphere surface, we want roughly equal angular spacing
        // The surface area element is sin(phi) * dtheta * dphi, so we need more
        // theta divisions than phi divisions to account for the sin(phi) factor
        const numThetaCells = Math.ceil(Math.sqrt(targetCellCount * 2));
        const numPhiCells = Math.ceil(Math.sqrt(targetCellCount / 2));
        return {
            thetaStepSize: (2 * Math.PI) / numThetaCells,
            phiStepSize: Math.PI / numPhiCells,
            thetaRange: [0, 2 * Math.PI], // Fixed: theta is now consistently [0, 2π)
            phiRange: [0, Math.PI],
        };
    }
    getRegionOfOrientation(orientation) {
        const { theta, phi } = orientation.sphericalAngles;
        // theta is already in [0, 2π) range from our fixed sphericalAngles getter
        const thetaIndex = Math.floor(theta / this.config.thetaStepSize);
        const phiIndex = Math.floor(phi / this.config.phiStepSize);
        // Ensure indices stay within bounds (handle edge cases)
        const clampedThetaIdx = Math.max(0, Math.min(thetaIndex, this.maxThetaIdx));
        const clampedPhiIdx = Math.max(0, Math.min(phiIndex, this.maxPhiIdx));
        return `${clampedThetaIdx},${clampedPhiIdx}`;
    }
    buildSpatialHashGrid() {
        for (const [orientationKey, orientation] of this.orientations) {
            const regionKey = this.getRegionOfOrientation(orientation);
            if (!this.grid.has(regionKey)) {
                this.grid.set(regionKey, []);
            }
            this.grid.get(regionKey).push(orientationKey);
            this.orientationsToGridRegions.set(orientationKey, regionKey);
        }
        // Calculate average orientations per region
        const totalOrientations = Array.from(this.grid.values()).reduce((sum, orientations) => sum + orientations.length, 0);
        const regionCount = this.grid.size;
        return regionCount > 0 ? totalOrientations / regionCount : 0;
    }
    buildGridNeighbors() {
        // Store the neighbors for each region
        for (const regionKey of this.grid.keys()) {
            const [thetaIndex, phiIndex] = regionKey.split(",").map(Number);
            const neighbors = [];
            // Theta neighbors (with wraparound since theta is cyclic)
            const prevTheta = thetaIndex === 0 ? this.maxThetaIdx : thetaIndex - 1;
            const nextTheta = thetaIndex === this.maxThetaIdx ? 0 : thetaIndex + 1;
            neighbors.push(`${prevTheta},${phiIndex}`);
            neighbors.push(`${nextTheta},${phiIndex}`);
            // Phi neighbors (no wraparound at poles)
            if (phiIndex > 0) {
                neighbors.push(`${thetaIndex},${phiIndex - 1}`);
            }
            if (phiIndex < this.maxPhiIdx) {
                neighbors.push(`${thetaIndex},${phiIndex + 1}`);
            }
            // Diagonal neighbors
            if (phiIndex > 0) {
                neighbors.push(`${prevTheta},${phiIndex - 1}`);
                neighbors.push(`${nextTheta},${phiIndex - 1}`);
            }
            if (phiIndex < this.maxPhiIdx) {
                neighbors.push(`${prevTheta},${phiIndex + 1}`);
                neighbors.push(`${nextTheta},${phiIndex + 1}`);
            }
            this.gridNeighbors.set(regionKey, neighbors.filter((key) => this.grid.has(key)));
        }
    }
    calculateOcclusionData() {
        // Iterate through all possible voxel positions within the sphere radius
        const maxRadius = Math.max(...Array.from(this.orientationsToSurfaceVoxels.values()).map((v) => v.distanceTo(new vec3_1.Vec3(0, 0, 0))));
        const range = Math.ceil(maxRadius + 1);
        for (let x = -range; x <= range; x++) {
            for (let y = -range; y <= range; y++) {
                for (let z = -range; z <= range; z++) {
                    const voxelOffset = new vec3_1.Vec3(x, y, z);
                    // Skip origin voxel (bot's position)
                    if (x === 0 && y === 0 && z === 0)
                        continue;
                    const distance = voxelOffset.distanceTo(new vec3_1.Vec3(0, 0, 0));
                    // Only consider voxels within reasonable range (up to sphere radius)
                    if (distance > maxRadius)
                        continue;
                    const voxelOffsetKey = (0, generic_1.serializeVec3)(voxelOffset);
                    // Calculate angular radius: approximate the voxel as a sphere with radius √3/2
                    // (half the diagonal of a unit cube) at the given distance
                    const voxelHalfDiagonal = Math.sqrt(3) / 2;
                    const angularRadius = Math.atan(voxelHalfDiagonal / distance);
                    this.voxelsToOcclusionRadii.set(voxelOffsetKey, angularRadius);
                    // Get the orientation that points toward this voxel's center
                    const centerOrientation = new types_1.ThreeDimOrientation({
                        towards: voxelOffset,
                    });
                    const centerAngles = centerOrientation.sphericalAngles;
                    // Find all grid regions that would be wholly occluded by this voxel
                    const occludedRegions = [];
                    // Check each grid region to see if it's wholly within the occlusion area
                    for (const [regionKey, orientationsInRegion] of this.grid) {
                        let regionWhollyOccluded = true;
                        // A region is wholly occluded if ALL orientations in it are within the angular radius
                        for (const orientationKey of orientationsInRegion) {
                            const orientation = this.orientations.get(orientationKey);
                            // Calculate angular distance between this orientation and the voxel center
                            const angularDistance = centerOrientation.distanceTo(orientation);
                            // If any orientation in the region is outside the occlusion radius,
                            // the region is not wholly occluded
                            if (angularDistance > angularRadius) {
                                regionWhollyOccluded = false;
                                break;
                            }
                        }
                        if (regionWhollyOccluded) {
                            occludedRegions.push(regionKey);
                        }
                    }
                    this.voxelsToOccludedRegions.set(voxelOffsetKey, occludedRegions);
                }
            }
        }
    }
    get(regionKey) {
        return this.grid.get(regionKey) || [];
    }
    getNeighboringRegions(regionKey) {
        return this.gridNeighbors.get(regionKey) || [];
    }
}
exports.SphereSurfaceHash = SphereSurfaceHash;

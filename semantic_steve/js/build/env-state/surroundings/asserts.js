"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertMinimumRaycastDensity = assertMinimumRaycastDensity;
/**
 * Ensures we have enough rays to hit every Minecraft block at the given radius.
 *
 * Math: At radius R, blocks are arranged on a sphere with surface area 4πR².
 * Since each block is 1x1, we need roughly 4πR² rays minimum.
 */
function assertMinimumRaycastDensity(radiusOfInterest, nRaycastOrientations, conservativeFactor = 1.2) {
    // Surface area of sphere at radius
    const sphereSurfaceArea = 4 * Math.PI * radiusOfInterest * radiusOfInterest;
    // Blocks on surface (each block = 1x1 area)
    const blocksOnSurface = sphereSurfaceArea;
    // Apply safety factor for discretization effects
    const minimumRaysRequired = Math.ceil(blocksOnSurface * conservativeFactor);
    if (nRaycastOrientations < minimumRaysRequired) {
        // Calculate ray spacing for diagnostics
        const areaPerRay = sphereSurfaceArea / nRaycastOrientations;
        const approximateRaySpacing = Math.sqrt(areaPerRay);
        throw new Error(`Need ${minimumRaysRequired} rays for radius ${radiusOfInterest}, have ${nRaycastOrientations}. ` +
            `Current ray spacing: ${approximateRaySpacing.toFixed(2)} blocks.`);
    }
    console.log(`✓ ${nRaycastOrientations} rays sufficient for ${Math.ceil(blocksOnSurface)} blocks at radius ${radiusOfInterest}`);
}

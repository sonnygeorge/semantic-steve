"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncSleep = void 0;
exports.isValidEmail = isValidEmail;
exports.bilinearInterpolate = bilinearInterpolate;
const vec3_1 = require("vec3");
const asyncSleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.asyncSleep = asyncSleep;
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
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

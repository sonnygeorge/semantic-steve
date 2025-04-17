"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Biome = void 0;
const assert_1 = __importDefault(require("assert"));
class Biome {
    constructor(bot, name) {
        this.bot = bot;
        this.name = name;
        this.id = -1;
        for (const [id, biome] of Object.entries(this.bot.registry.biomes)) {
            if (biome.name === this.name) {
                this.id = parseInt(id);
            }
        }
        (0, assert_1.default)(this.id !== -1, `This should be impossible if this object is being created by the factory`);
    }
    isVisibleInImmediateSurroundings() {
        return this.bot.envState.surroundings.immediate.biomes.has(this.id);
    }
    isVisibleInDistantSurroundings() {
        return [...this.bot.envState.surroundings.distant.values()].some((dir) => dir.biomesToClosestCoords.has(this.id));
    }
    // Main locateNearest method that follows the interface pattern
    locateNearest() {
        // Try immediate surroundings first
        const immediateResult = this.locateNearestInImmediateSurroundings();
        if (immediateResult !== null) {
            return immediateResult;
        }
        // If not found in immediate surroundings, try distant surroundings
        return this.locateNearestInDistantSurroundings();
    }
    // Method to locate in immediate surroundings
    locateNearestInImmediateSurroundings() {
        if (this.isVisibleInImmediateSurroundings()) {
            return this.bot.entity.position.clone(); // assume we are in it
        }
        return null;
    }
    // Method to locate in distant surroundings with optional direction
    locateNearestInDistantSurroundings(direction) {
        const id = this.id;
        // If a specific direction is provided, check only that direction
        if (direction && direction !== "immediate") {
            const distant = this.bot.envState.surroundings.distant.get(direction);
            if (distant != null) {
                const coords = distant.biomesToClosestCoords.get(id);
                if (coords != null) {
                    return coords.clone();
                }
            }
            return null;
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestCoords = null;
        let minDistance = Infinity;
        for (const dir of directions) {
            const distant = this.bot.envState.surroundings.distant.get(dir);
            if (distant != null) {
                const coords = distant.biomesToClosestCoords.get(id);
                if (coords != null) {
                    // Calculate distance to these coordinates
                    const distance = coords.distanceTo(this.bot.entity.position);
                    // Update closest if this is closer than what we've found so far
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCoords = coords.clone();
                    }
                }
            }
        }
        return closestCoords;
    }
}
exports.Biome = Biome;

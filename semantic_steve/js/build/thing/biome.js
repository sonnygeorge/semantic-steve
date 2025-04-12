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
    locateNearest(direction) {
        var _a;
        const id = (_a = this.bot.registry.biomesByName[this.name]) === null || _a === void 0 ? void 0 : _a.id;
        // Check immediate surroundings first (regardless of direction parameter)
        if (!id) {
            return null;
        }
        // If in immediate surroundings, return current position
        if (this.bot.envState.surroundings.immediate.biomes.has(id)) {
            return this.bot.entity.position.clone(); // assume we are in it
        }
        // If direction is explicitly set to "immediate", we've already checked and didn't find it
        if (direction === "immediate") {
            return null;
        }
        // If a specific direction is provided (and it's not "immediate"), check only that direction
        if (direction) {
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
        // Get all directions from the surroundings map
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiomeType = void 0;
const assert_1 = __importDefault(require("assert"));
class BiomeType {
    constructor(bot, name) {
        const biomeNames = Object.values(bot.registry.biomes).map((b) => b.name);
        if (!biomeNames.includes(name)) {
            throw new Error(`Invalid biome type: ${name}.`);
        }
        this.bot = bot;
        this.name = name;
        this.id = -1;
        for (const [id, biome] of Object.entries(this.bot.registry.biomes)) {
            if (biome.name === this.name) {
                this.id = parseInt(id);
            }
        }
        (0, assert_1.default)(this.id !== -1, `This should be impossible. We should have thrown an error above.`);
    }
    // ================================
    // Implementation of ThingType API
    // ================================
    isVisibleInImmediateSurroundings() {
        for (const biomeName of this.bot.envState.surroundings.immediate.getDistinctBiomeNames()) {
            if (biomeName === this.name) {
                return true;
            }
        }
        return false;
    }
    isVisibleInDistantSurroundings() {
        for (const dir of this.bot.envState.surroundings.distant.values()) {
            for (const biomeName of dir.getDistinctBiomeNames()) {
                if (biomeName === this.name) {
                    return true;
                }
            }
        }
        return false;
    }
    locateNearest() {
        // Try immediate surroundings first
        const immediateResult = this.locateNearestInImmediateSurroundings();
        if (immediateResult !== null) {
            return immediateResult;
        }
        // If not found in immediate surroundings, try distant surroundings
        return this.locateNearestInDistantSurroundings();
    }
    locateNearestInImmediateSurroundings() {
        for (const [name, closestCoords,] of this.bot.envState.surroundings.immediate.getBiomeNamesToClosestCoords()) {
            if (name === this.name) {
                return closestCoords.clone();
            }
        }
    }
    locateNearestInDistantSurroundings(direction) {
        // If a specific direction is provided, check only that direction
        if (direction) {
            const vicinity = this.bot.envState.surroundings.distant.get(direction);
            for (const [name, closestCoords,] of vicinity.getBiomeNamesToClosestCoords()) {
                if (name === this.name) {
                    return closestCoords.clone();
                }
            }
            return undefined; // Not found in the specified direction
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestOfClosestCoords = undefined;
        let smallestDistance = Infinity;
        for (const dir of directions) {
            const vicinity = this.bot.envState.surroundings.distant.get(dir);
            for (const [name, closestCoords,] of vicinity.getBiomeNamesToClosestCoords()) {
                if (name === this.name) {
                    const distance = closestCoords.distanceTo(this.bot.entity.position);
                    if (distance < smallestDistance) {
                        smallestDistance = distance;
                        closestOfClosestCoords = closestCoords.clone();
                    }
                    break;
                }
            }
        }
        return closestOfClosestCoords;
    }
    isVisibleInImmediateSurroundingsAt(coords) {
        throw new Error("Method not implemented. This method is yet not usable for biomes.");
    }
}
exports.BiomeType = BiomeType;

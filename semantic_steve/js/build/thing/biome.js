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
        if (this.isVisibleInImmediateSurroundings()) {
            return this.bot.entity.position.clone(); // assume we are in it
        }
    }
    locateNearestInDistantSurroundings(direction) {
        var _a;
        const id = this.id;
        // If a specific direction is provided, check only that direction
        if (direction) {
            const surroundingsInDirection = this.bot.envState.surroundings.distant.get(direction);
            if (surroundingsInDirection) {
                return (_a = surroundingsInDirection.biomesToClosestCoords.get(id)) === null || _a === void 0 ? void 0 : _a.clone();
            }
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestCoords = undefined;
        let minDistance = Infinity;
        for (const dir of directions) {
            const distant = this.bot.envState.surroundings.distant.get(dir);
            if (distant) {
                const coords = distant.biomesToClosestCoords.get(id);
                if (coords) {
                    const distance = coords.distanceTo(this.bot.entity.position);
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

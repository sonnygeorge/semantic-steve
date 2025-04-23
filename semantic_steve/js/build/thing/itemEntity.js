"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemEntity = void 0;
/**
 * An item type that is "dropped", is hovering on the ground, and can be picked up.
 */
class ItemEntity {
    constructor(bot, name) {
        this.bot = bot;
        this.name = name;
    }
    isVisibleInImmediateSurroundings() {
        return this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.has(this.name);
    }
    isVisibleInDistantSurroundings() {
        return [...this.bot.envState.surroundings.distant.values()].some((dir) => dir.itemEntitiesToCounts.has(this.name));
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
        const immediate = this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.get(this.name);
        if (immediate != null && immediate.length > 0) {
            return immediate[0];
        }
        return null;
    }
    // Method to locate in distant surroundings with optional direction
    locateNearestInDistantSurroundings(direction) {
        var _a;
        // If a specific direction is provided, check only that direction
        if (direction && direction !== "immediate") {
            const distant = this.bot.envState.surroundings.distant.get(direction);
            if (distant != null) {
                const count = distant.itemEntitiesToCounts.get(this.name);
                if (count != null && count > 0) {
                    return (_a = distant.itemEntitiesToClosestCoords.get(this.name)) !== null && _a !== void 0 ? _a : null;
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
                const count = distant.itemEntitiesToCounts.get(this.name);
                if (count != null && count > 0) {
                    const coords = distant.itemEntitiesToClosestCoords.get(this.name);
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
        }
        return closestCoords;
    }
}
exports.ItemEntity = ItemEntity;

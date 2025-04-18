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
    locateNearest() {
        // Try immediate surroundings first
        const immediateResult = this.locateNearestInImmediateSurroundings();
        if (immediateResult) {
            return immediateResult;
        }
        // If not found in immediate surroundings, try distant surroundings
        return this.locateNearestInDistantSurroundings();
    }
    locateNearestInImmediateSurroundings() {
        const immediate = this.bot.envState.surroundings.immediate.itemEntitiesToAllCoords.get(this.name);
        if (immediate && immediate.length > 0) {
            return immediate[0];
        }
    }
    locateNearestInDistantSurroundings(direction) {
        // If a specific direction is provided, check only that direction
        if (direction) {
            const surroundingsInDirection = this.bot.envState.surroundings.distant.get(direction);
            if (surroundingsInDirection) {
                const count = surroundingsInDirection.itemEntitiesToCounts.get(this.name);
                if (count && count > 0) {
                    return surroundingsInDirection.itemEntitiesToClosestCoords.get(this.name);
                }
            }
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestCoords = undefined;
        let minDistance = Infinity;
        for (const dir of directions) {
            const surroundingsInDir = this.bot.envState.surroundings.distant.get(dir);
            if (surroundingsInDir) {
                const count = surroundingsInDir.itemEntitiesToCounts.get(this.name);
                if (count && count > 0) {
                    const coords = surroundingsInDir.itemEntitiesToClosestCoords.get(this.name);
                    if (coords) {
                        const distance = coords.distanceTo(this.bot.entity.position);
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

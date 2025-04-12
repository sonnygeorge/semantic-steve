"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
class Block {
    constructor(bot, name) {
        this.bot = bot;
        this.name = name;
    }
    isVisibleInImmediateSurroundings() {
        return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(this.name);
    }
    isVisibleInDistantSurroundings() {
        return [...this.bot.envState.surroundings.distant.values()].some((dir) => dir.blocksToCounts.has(this.name));
    }
    locateNearest(direction) {
        var _a;
        // Check immediate surroundings first (regardless of direction parameter)
        const immediate = this.bot.envState.surroundings.immediate.blocksToAllCoords.get(this.name);
        if (immediate != null && immediate.length > 0) {
            return immediate[0];
        }
        // If direction is explicitly set to "immediate", we've already checked and didn't find it
        if (direction === "immediate") {
            return null;
        }
        // If a specific direction is provided (and it's not "immediate"), check only that direction
        if (direction) {
            const distant = this.bot.envState.surroundings.distant.get(direction);
            if (distant != null) {
                const count = distant.blocksToCounts.get(this.name);
                if (count != null && count > 0) {
                    return (_a = distant.blocksToClosestCoords.get(this.name)) !== null && _a !== void 0 ? _a : null;
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
                const count = distant.blocksToCounts.get(this.name);
                if (count != null && count > 0) {
                    const coords = distant.blocksToClosestCoords.get(this.name);
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
exports.Block = Block;

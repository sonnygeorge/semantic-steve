"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Block = void 0;
const types_1 = require("../types");
class Block {
    constructor(bot, name) {
        if (name in bot.registry.blocksByName) {
            this.name = name;
            this.data = bot.registry.blocksByName[name];
        }
        else {
            throw new types_1.InvalidThingError(`Invalid block type: ${name}.`);
        }
        this.bot = bot;
        this.name = name;
    }
    isVisibleInImmediateSurroundings() {
        return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(this.name);
    }
    isVisibleInDistantSurroundings() {
        return [...this.bot.envState.surroundings.distant.values()].some((dir) => dir.blocksToCounts.has(this.name));
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
        const immediate = this.bot.envState.surroundings.immediate.blocksToAllCoords.get(this.name);
        if (immediate && immediate.length > 0) {
            return immediate[0];
        }
    }
    locateNearestInDistantSurroundings(direction) {
        // If a specific direction is provided, check only that direction
        if (direction) {
            const surroundingsInDirection = this.bot.envState.surroundings.distant.get(direction);
            if (surroundingsInDirection) {
                const count = surroundingsInDirection.blocksToCounts.get(this.name);
                if (count && count > 0) {
                    return surroundingsInDirection.blocksToClosestCoords.get(this.name);
                }
            }
            return undefined; // No blocks found in the specified direction
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestCoords = undefined;
        let minDistance = Infinity;
        for (const dir of directions) {
            const surroundingsInDir = this.bot.envState.surroundings.distant.get(dir);
            if (surroundingsInDir) {
                const count = surroundingsInDir.blocksToCounts.get(this.name);
                if (count && count > 0) {
                    const coords = surroundingsInDir.blocksToClosestCoords.get(this.name);
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
exports.Block = Block;

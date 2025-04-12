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
}
exports.Block = Block;

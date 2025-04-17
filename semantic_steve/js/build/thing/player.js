"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(bot, name) {
        this.bot = bot;
        this.name = name;
    }
    locateNearestInImmediateSurroundings() {
        throw new Error("Method not implemented.");
    }
    locateNearestInDistantSurroundings(direction) {
        throw new Error("Method not implemented.");
    }
    locateNearest(direction) {
        throw new Error("Method not implemented.");
    }
    isVisibleInImmediateSurroundings() {
        return this.bot.envState.surroundings.immediate.blocksToAllCoords.has(this.name);
    }
    isVisibleInDistantSurroundings() {
        return [...this.bot.envState.surroundings.distant.values()].some((dir) => dir.blocksToCounts.has(this.name));
    }
}
exports.Player = Player;

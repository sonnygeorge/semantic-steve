"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skill = void 0;
/**
 * The interface that all skills must implement.
 */
class Skill {
    constructor(bot, onResolution) {
        this.bot = bot;
        this.onResolution = onResolution;
    }
}
exports.Skill = Skill;

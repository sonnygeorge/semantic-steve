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
}
exports.Biome = Biome;

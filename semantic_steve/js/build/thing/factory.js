"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThingFactory = exports.InvalidThingError = exports.SUPPORTED_THING_TYPES = void 0;
const block_1 = require("./block");
const biome_1 = require("./biome");
exports.SUPPORTED_THING_TYPES = "['block', 'biome']";
class InvalidThingError extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidThingTypeError";
    }
}
exports.InvalidThingError = InvalidThingError;
class ThingFactory {
    constructor(bot) {
        this.bot = bot;
    }
    /**
     * Creates a Thing object based on the provided input string.
     * @param thing The name of the thing to create (e.g., "wood_planks", "plains").
     * @returns {Thing} The created Thing object.
     * @throws {InvalidThingError} If the input string does not correspond to a valid (supported) thing.
     */
    createThing(thing) {
        // Block
        const blockNames = Object.values(this.bot.registry.blocksByName).map((b) => b.name);
        if (blockNames.includes(thing)) {
            return new block_1.Block(this.bot, thing);
        }
        // Biome
        const biomeNames = Object.values(this.bot.registry.biomes).map((b) => b.name);
        if (biomeNames.includes(thing)) {
            return new biome_1.Biome(this.bot, thing);
        }
        throw new InvalidThingError(`Invalid thing type: ${thing}. Supported types are: ${exports.SUPPORTED_THING_TYPES}`);
    }
}
exports.ThingFactory = ThingFactory;

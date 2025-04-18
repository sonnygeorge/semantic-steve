"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThingFactory = exports.InvalidThingError = exports.SUPPORTED_THING_TYPES = void 0;
const block_1 = require("./block");
const biome_1 = require("./biome");
const item_entity_1 = require("./item-entity");
exports.SUPPORTED_THING_TYPES = ['block', 'biome', 'itemEntity'];
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
    createBlock(thing) {
        const blockNames = Object.values(this.bot.registry.blocksByName).map((b) => b.name);
        if (blockNames.includes(thing)) {
            return new block_1.Block(this.bot, thing);
        }
        return null;
    }
    createBiome(thing) {
        const biomeNames = Object.values(this.bot.registry.biomes).map((b) => b.name);
        if (biomeNames.includes(thing)) {
            return new biome_1.Biome(this.bot, thing);
        }
        return null;
    }
    createItemEntity(thing) {
        const itemEntityNames = Object.values(this.bot.registry.itemsByName).map((i) => i.name);
        if (itemEntityNames.includes(thing)) {
            return new item_entity_1.ItemEntity(this.bot, thing);
        }
        return null;
    }
    /**
     * Creates a Thing object based on the provided input string.
     * @param thing The name of the thing to create (e.g., "wood_planks", "plains").
     * @returns {Thing} The created Thing object.
     * @throws {InvalidThingError} If the input string does not correspond to a valid (supported) thing.
     */
    createThing(thing, preferred) {
        if (preferred != null) {
            switch (preferred.name) {
                case "Block":
                    const block = this.createBlock(thing);
                    if (block != null) {
                        return block;
                    }
                    break;
                case "Biome":
                    const biome = this.createBiome(thing);
                    if (biome != null) {
                        return biome;
                    }
                    break;
                case "ItemEntity":
                    const itemEntity = this.createItemEntity(thing);
                    if (itemEntity != null) {
                        return itemEntity;
                    }
                    break;
            }
        }
        // now try all
        const block = this.createBlock(thing);
        if (block != null) {
            return block;
        }
        const biome = this.createBiome(thing);
        if (biome != null) {
            return biome;
        }
        const itemEntity = this.createItemEntity(thing);
        if (itemEntity != null) {
            return itemEntity;
        }
        throw new InvalidThingError(`Invalid thing type: ${thing}. Supported types are: ${exports.SUPPORTED_THING_TYPES}`);
    }
}
exports.ThingFactory = ThingFactory;

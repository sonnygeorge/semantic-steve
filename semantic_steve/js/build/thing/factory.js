"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThingFactory = exports.SUPPORTED_THING_TYPES = void 0;
const block_1 = require("./block");
const biome_1 = require("./biome");
const item_entity_1 = require("./item-entity");
const types_1 = require("../types");
exports.SUPPORTED_THING_TYPES = ["block", "biome", "itemEntity"];
class ThingFactory {
    constructor(bot) {
        this.bot = bot;
    }
    createThing(thingName) {
        const attemptCreate = (Type) => {
            try {
                return new Type(this.bot, thingName);
            }
            catch (err) {
                if (!(err instanceof types_1.InvalidThingError))
                    throw err;
                return null;
            }
        };
        // Try each type in order of precedence
        const types = [block_1.Block, item_entity_1.ItemEntity, biome_1.Biome];
        for (const Type of types) {
            const result = attemptCreate(Type);
            if (result)
                return result;
        }
        // If we reach here, it means the thingName is not valid for any supported type
        throw new types_1.InvalidThingError(`Invalid thing name: ${thingName}. Supported types are: ${exports.SUPPORTED_THING_TYPES}`);
    }
}
exports.ThingFactory = ThingFactory;

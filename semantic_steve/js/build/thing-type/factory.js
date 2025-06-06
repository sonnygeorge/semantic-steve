"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThingTypeFactory = exports.SUPPORTED_THING_TYPES = void 0;
const block_type_1 = require("./implementations/block-type");
const biome_type_1 = require("./implementations/biome-type");
const item_type_1 = require("./implementations/item-type");
const types_1 = require("../types");
exports.SUPPORTED_THING_TYPES = ["block", "biome", "item"];
class ThingTypeFactory {
    constructor(bot) {
        this.bot = bot;
    }
    createThingType(name) {
        const attemptCreate = (Type) => {
            try {
                return new Type(this.bot, name);
            }
            catch (err) {
                if (!(err instanceof types_1.InvalidThingError))
                    throw err;
                return null;
            }
        };
        // Try each type in order of precedence
        const types = [block_type_1.BlockType, item_type_1.ItemType, biome_type_1.BiomeType];
        for (const Type of types) {
            const result = attemptCreate(Type);
            if (result)
                return result;
        }
        // If we reach here, it means the name is not valid for any supported type
        throw new types_1.InvalidThingError(`Invalid thing name: ${name}. Supported types are: ${exports.SUPPORTED_THING_TYPES}`);
    }
}
exports.ThingTypeFactory = ThingTypeFactory;

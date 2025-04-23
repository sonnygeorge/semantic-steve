"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericSkillResults = exports.SkillStatus = exports.Skill = void 0;
exports.buildSkillsRegistry = buildSkillsRegistry;
const skill_1 = require("./skill");
Object.defineProperty(exports, "Skill", { enumerable: true, get: function () { return skill_1.Skill; } });
Object.defineProperty(exports, "SkillStatus", { enumerable: true, get: function () { return skill_1.SkillStatus; } });
const pathfind_to_coordinates_1 = require("./pathfind-to-coordinates/pathfind-to-coordinates");
const craft_items_1 = require("./craft-items/craft-items");
const mine_blocks_1 = require("./mine-blocks/mine-blocks");
const place_block_1 = require("./place-block/place-block");
const smelt_items_1 = require("./smelt-items/smelt-items");
const take_screenshot_of_1 = require("./take-screenshot-of/take-screenshot-of");
const approach_1 = require("./approach/approach");
const pickup_item_1 = require("./pickup-item/pickup-item");
const get_placeable_coordinates_1 = require("./get-placeable-coordinates/get-placeable-coordinates");
const generic_results_1 = require("./generic-results");
Object.defineProperty(exports, "GenericSkillResults", { enumerable: true, get: function () { return generic_results_1.GenericSkillResults; } });
function buildSkillsRegistry(bot, onResolution) {
    return {
        [pathfind_to_coordinates_1.PathfindToCoordinates.METADATA.name]: new pathfind_to_coordinates_1.PathfindToCoordinates(bot, onResolution),
        [take_screenshot_of_1.TakeScreenshotOf.METADATA.name]: new take_screenshot_of_1.TakeScreenshotOf(bot, onResolution),
        [craft_items_1.CraftItems.METADATA.name]: new craft_items_1.CraftItems(bot, onResolution),
        [mine_blocks_1.MineBlocks.METADATA.name]: new mine_blocks_1.MineBlocks(bot, onResolution),
        [place_block_1.PlaceBlock.METADATA.name]: new place_block_1.PlaceBlock(bot, onResolution),
        [smelt_items_1.SmeltItems.METADATA.name]: new smelt_items_1.SmeltItems(bot, onResolution),
        [approach_1.Approach.METADATA.name]: new approach_1.Approach(bot, onResolution),
        [pickup_item_1.PickupItem.METADATA.name]: new pickup_item_1.PickupItem(bot, onResolution),
        [get_placeable_coordinates_1.GetPlaceableCoordinates.METADATA.name]: new get_placeable_coordinates_1.GetPlaceableCoordinates(bot, onResolution),
    };
}

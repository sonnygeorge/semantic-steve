"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDurability = getDurability;
function getDurability(bot, item) {
    // For newer Mineflayer versions that use the `durabilityUsed` property
    if (item.durabilityUsed) {
        return item.durabilityUsed;
    }
    // For older Mineflayer versions that use metadata directly
    if (bot.registry.supportFeature("nbtOnMetadata")) {
        if (item.metadata !== undefined) {
            return item.metadata;
        }
    }
}

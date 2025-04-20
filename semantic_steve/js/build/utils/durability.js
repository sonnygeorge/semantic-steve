"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDurabilityPercentRemaining = getDurabilityPercentRemaining;
exports.getDurabilityRemainingString = getDurabilityRemainingString;
function getDurabilityPercentRemaining(item) {
    if (item.durabilityUsed) {
        return Math.floor((1 - item.durabilityUsed / item.maxDurability) * 100);
    }
}
function getDurabilityRemainingString(item) {
    const durability = getDurabilityPercentRemaining(item);
    if (durability !== undefined) {
        return `${durability}%`;
    }
}

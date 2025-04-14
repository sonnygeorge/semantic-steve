"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryChangesDTO = getInventoryChangesDTO;
const assert_1 = __importDefault(require("assert"));
function getInventoryChangesDTO(bot, inventoryDifferential) {
    let itemsAcquired = {};
    let itemsLostOrConsumed = {};
    let durabilityChanges = [];
    for (const id in inventoryDifferential) {
        const itemDiff = inventoryDifferential[id];
        const itemName = bot.registry.items[id].name;
        if (itemDiff.countDifferential !== undefined) {
            (0, assert_1.default)(itemDiff.countDifferential !== 0, "We should never save a differential of 0, should be undefined instead");
            if (itemDiff.countDifferential > 0) {
                itemsAcquired[itemName] = itemDiff.countDifferential;
            }
            else {
                console.log(itemDiff.countDifferential);
                itemsLostOrConsumed[itemName] = -itemDiff.countDifferential;
            }
        }
        if (itemDiff.durabilityUsed !== undefined) {
            (0, assert_1.default)(itemDiff.curDurability !== undefined, "This shouldn't be undefined if we have durabilityUsed");
            durabilityChanges.push(`${itemName} lost ${itemDiff.durabilityUsed} durability and is now at ${itemDiff.curDurability} durability.`);
        }
    }
    return {
        itemsAcquired: itemsAcquired,
        itemsLostOrConsumed: itemsLostOrConsumed,
        changedDurabilities: durabilityChanges,
    };
}

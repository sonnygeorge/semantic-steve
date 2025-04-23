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
    for (const [itemName, countDifferential] of inventoryDifferential.entries()) {
        (0, assert_1.default)(countDifferential !== 0, "We should never save a differential of 0, should be undefined instead");
        if (countDifferential > 0) {
            itemsAcquired[itemName] = countDifferential;
        }
        else {
            itemsLostOrConsumed[itemName] = -countDifferential;
        }
    }
    return {
        itemsAcquired: itemsAcquired,
        itemsLostOrConsumed: itemsLostOrConsumed,
    };
}

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureItemEntityHasUUID = ensureItemEntityHasUUID;
exports.ensureItemData = ensureItemData;
const assert_1 = __importDefault(require("assert"));
function ensureItemEntityHasUUID(bot, itemEntity) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, assert_1.default)(itemEntity.name === "item");
        // If no UUID, listen for entityUpdate on the entity until it has one.
        if (!itemEntity.uuid) {
            yield new Promise((res, rej) => {
                const listener = (e) => {
                    if (e.id === itemEntity.id && e.uuid) {
                        res();
                        bot.off("entityUpdate", listener);
                    }
                };
                bot.on("entityUpdate", listener);
                setTimeout(() => {
                    rej(new Error("Timeout waiting for entity uuid."));
                    bot.off("entityUpdate", listener);
                }, 5000);
            });
        }
        (0, assert_1.default)(itemEntity.uuid);
        return itemEntity;
    });
}
function ensureItemData(bot, itemEntity) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, assert_1.default)(itemEntity.name === "item");
        itemEntity = yield ensureItemEntityHasUUID(bot, itemEntity);
        // Now we can safely get the item data (PItem).
        const pItem = itemEntity.getDroppedItem();
        (0, assert_1.default)(pItem);
        return {
            entity: itemEntity,
            itemData: pItem,
        };
    });
}

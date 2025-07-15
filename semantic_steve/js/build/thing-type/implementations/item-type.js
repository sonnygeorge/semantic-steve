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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemType = void 0;
const types_1 = require("../../types");
class ItemType {
    constructor(bot, name, id) {
        if (name) {
            const itemEntityNames = Object.values(bot.registry.itemsByName).map((i) => i.name);
            if (!itemEntityNames.includes(name)) {
                throw new types_1.InvalidThingError(`Invalid item entity type: ${name}.`);
            }
            this.name = name;
            this.id = bot.registry.itemsByName[name].id;
        }
        else if (id) {
            const itemEntityIds = Object.values(bot.registry.items).map((i) => i.id);
            if (!itemEntityIds.includes(id)) {
                throw new types_1.InvalidThingError(`Invalid item entity id: ${id}.`);
            }
            this.id = id;
            this.name = bot.registry.items[id].name;
        }
        else {
            throw new Error("Either name or id must be provided to create an ItemEntity.");
        }
        this.bot = bot;
    }
    // ======================
    // Item-specific methods
    // ======================
    getTotalCountInInventory() {
        return this.bot.envState.inventory.itemsToTotalCounts.get(this.name) || 0;
    }
    // ================================
    // Implementation of ThingType API
    // ================================
    isVisibleInImmediateSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            try {
                for (var _d = true, _e = __asyncValues(this.bot.envState.surroundings.immediate.visible.getDistinctItemNames()), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const itemName = _c;
                    if (itemName === this.name) {
                        return true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return false;
        });
    }
    isVisibleInDistantSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_2, _b, _c;
            for (const dir of this.bot.envState.surroundings.distant.values()) {
                try {
                    for (var _d = true, _e = (e_2 = void 0, __asyncValues(dir.visible.getDistinctItemNames())), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const itemName = _c;
                        if (itemName === this.name) {
                            return true;
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            return false;
        });
    }
    locateNearest() {
        return __awaiter(this, void 0, void 0, function* () {
            // Try immediate surroundings first
            const immediateResult = yield this.locateNearestInImmediateSurroundings();
            if (immediateResult) {
                return immediateResult;
            }
            // If not found in immediate surroundings, try distant surroundings
            return yield this.locateNearestInDistantSurroundings();
        });
    }
    locateNearestInImmediateSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            const itemNamesToClosestCoords = yield this.bot.envState.surroundings.immediate.visible.getItemNamesToClosestCoords();
            for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
                if (name === this.name) {
                    return closestCoords.clone();
                }
            }
        });
    }
    locateNearestInDistantSurroundings(direction) {
        return __awaiter(this, void 0, void 0, function* () {
            // If a specific direction is provided, check only that direction
            if (direction) {
                const vicinity = this.bot.envState.surroundings.distant.get(direction);
                const itemNamesToClosestCoords = yield vicinity.visible.getItemNamesToClosestCoords();
                for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
                    if (name === this.name) {
                        return closestCoords.clone();
                    }
                }
                return undefined; // Not found in the specified direction
            }
            // If no direction specified, check all directions
            const directions = Array.from(this.bot.envState.surroundings.distant.keys());
            // Find the closest coordinates across all directions
            let closestOfClosestCoords = undefined;
            let smallestDistance = Infinity;
            for (const dir of directions) {
                const vicinity = this.bot.envState.surroundings.distant.get(dir);
                const itemNamesToClosestCoords = yield vicinity.visible.getItemNamesToClosestCoords();
                for (const [name, closestCoords] of itemNamesToClosestCoords.entries()) {
                    if (name === this.name) {
                        const distance = this.bot.entity.position.distanceTo(closestCoords);
                        if (distance < smallestDistance) {
                            smallestDistance = distance;
                            closestOfClosestCoords = closestCoords.clone();
                        }
                        break;
                    }
                }
            }
            return closestOfClosestCoords;
        });
    }
    isVisibleInImmediateSurroundingsAt(coords) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemNamesToAllCoords = yield this.bot.envState.surroundings.immediate.visible.getItemNamesToAllCoords();
            for (const [name, coordsIterable] of itemNamesToAllCoords.entries()) {
                if (name === this.name) {
                    for (const itemCoords of coordsIterable) {
                        if (itemCoords.equals(coords)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        });
    }
}
exports.ItemType = ItemType;

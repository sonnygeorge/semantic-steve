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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistantSurroundingsInADirection = exports.ImmediateSurroundings = exports.Vicinity = exports.VisibleVicinityContents = exports.VicinitiesObserver = void 0;
const assert_1 = __importDefault(require("assert"));
const types_1 = require("../../types");
const generic_1 = require("../../utils/generic");
const classify_vicinity_1 = require("./classify-vicinity");
const misc_1 = require("../../utils/misc");
const visibility_raycaster_1 = require("./visibility-raycaster");
const item_entity_1 = require("../../utils/item-entity");
const constants_1 = require("../../constants");
class VicinitiesObserver {
    constructor(bot, radii) {
        // Outer contexts can set this to something and wait for it to be set to back to null to
        // know that a cycle has completed. Lol, there's probably a better way to do this.
        this.thisGetsSetToNullAtEndOfObservationCycle = null;
        this.bot = bot;
        this.radii = radii;
        this.visibilityRaycaster = new visibility_raycaster_1.VisibilityRaycaster(bot, this.radii.distantSurroundingsRadius);
        this.immediate = new ImmediateSurroundings(bot, types_1.VicinityName.IMMEDIATE_SURROUNDINGS, this);
        this.distant = new Map(Object.values(types_1.DirectionName).map((direction) => [
            direction,
            new DistantSurroundingsInADirection(bot, direction, this),
        ]));
    }
    get visibleBlocks() {
        return this.visibilityRaycaster.visibleBlocks;
    }
    get visibilityMask() {
        return this.visibilityRaycaster.visibilityMask;
    }
    doObservationCycle(fromBotPos) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            try {
                // Invoke the VisibilityRayaster to do all of its raycasts in a cycle
                for (var _d = true, _e = __asyncValues(this.visibilityRaycaster.doRaycasting((0, misc_1.getEyePos)(this.bot, fromBotPos).floor())), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const [vecNorm, pBlock] = _c;
                    if (!vecNorm) {
                        break;
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
            this.thisGetsSetToNullAtEndOfObservationCycle = null;
        });
    }
    onPhysicsTick() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.visibilityRaycaster.isRaycasting) {
                yield this.doObservationCycle(this.bot.entity.position);
            }
        });
    }
    beginObservation() {
        return __awaiter(this, void 0, void 0, function* () {
            // Do an initial complete observation cycle
            yield this.doObservationCycle(this.bot.entity.position);
            // Setup listeners
            this.bot.on("physicsTick", this.onPhysicsTick.bind(this));
            // NOTE handling below is useless unless the itemEntityWithData.entity.position doesn't self-update(?)
            // this.bot.on("entityMoved", this.handleEntityMoved.bind(this));
        });
    }
}
exports.VicinitiesObserver = VicinitiesObserver;
class VisibleVicinityContents {
    constructor(bot, vicinity) {
        this.bot = bot;
        this.vicinity = vicinity;
    }
    // ======================
    // Block-related methods
    // ======================
    *getDistinctBlockNames() {
        const alreadyYielded = new Set();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            if (!alreadyYielded.has(block.name)) {
                yield block.name;
                alreadyYielded.add(block.name);
            }
        }
    }
    getBlockNamesToAllCoords() {
        const blockNamesToCoords = new Map();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            if (!blockNamesToCoords.has(block.name)) {
                blockNamesToCoords.set(block.name, []);
            }
            blockNamesToCoords.get(block.name).push(block.position);
        }
        return blockNamesToCoords;
    }
    getBlockNamesToClosestCoords() {
        const blockNamesToClosestCoords = new Map();
        const blockNamesToAllCoords = this.getBlockNamesToAllCoords();
        for (const [blockName, coords] of blockNamesToAllCoords.entries()) {
            if (coords.length > 0) {
                // Find the closest coordinate to the bot's position
                const closestCoord = coords.reduce((closest, current) => {
                    return closest.distanceTo(this.bot.entity.position) <
                        current.distanceTo(this.bot.entity.position)
                        ? closest
                        : current;
                });
                blockNamesToClosestCoords.set(blockName, closestCoord);
            }
        }
        return blockNamesToClosestCoords;
    }
    getBlockNamesToCounts() {
        const blockNamesToCounts = new Map();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            if (!blockNamesToCounts.has(block.name)) {
                blockNamesToCounts.set(block.name, 0);
            }
            blockNamesToCounts.set(block.name, blockNamesToCounts.get(block.name) + 1);
        }
        return blockNamesToCounts;
    }
    // ======================
    // Biome-related methods
    // ======================
    *getDistinctBiomeNames() {
        const alreadyYielded = new Set();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            const biomeName = this.bot.registry.biomes[block.biome.id].name;
            if (!alreadyYielded.has(biomeName)) {
                yield biomeName;
                alreadyYielded.add(biomeName);
            }
        }
    }
    getBiomeNamesToAllCoords() {
        const biomeNamesToCoords = new Map();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            const biomeName = this.bot.registry.biomes[block.biome.id].name;
            if (!biomeNamesToCoords.has(biomeName)) {
                biomeNamesToCoords.set(biomeName, []);
            }
            biomeNamesToCoords.get(biomeName).push(block.position);
        }
        return biomeNamesToCoords;
    }
    getBiomeNamesToClosestCoords() {
        const biomeNamesToClosestCoords = new Map();
        const biomeNamesToAllCoords = this.getBiomeNamesToAllCoords();
        for (const [biomeName, coords] of biomeNamesToAllCoords.entries()) {
            if (coords.length > 0) {
                // Find the closest coordinate to the bot's position
                const closestCoord = coords.reduce((closest, current) => {
                    return closest.distanceTo(this.bot.entity.position) <
                        current.distanceTo(this.bot.entity.position)
                        ? closest
                        : current;
                });
                biomeNamesToClosestCoords.set(biomeName, closestCoord);
            }
        }
        return biomeNamesToClosestCoords;
    }
    // =====================
    // Item-related methods
    // =====================
    getDistinctItemNames() {
        return __asyncGenerator(this, arguments, function* getDistinctItemNames_1() {
            const alreadyYielded = new Set();
            for (const entity of this.vicinity.iterVisibleEntities()) {
                if (entity.name === "item") {
                    // Ensure the loading of its uuid and PItem data
                    const itemEntityWithData = yield __await((0, item_entity_1.ensureItemData)(this.bot, entity));
                    if (!alreadyYielded.has(itemEntityWithData.itemData.name)) {
                        yield yield __await(itemEntityWithData.itemData.name);
                        alreadyYielded.add(itemEntityWithData.itemData.name);
                    }
                }
            }
        });
    }
    getItemNamesToAllCoords() {
        return __awaiter(this, void 0, void 0, function* () {
            const itemNamesToCoords = new Map();
            for (const entity of this.vicinity.iterVisibleEntities()) {
                if (entity.name === "item") {
                    // Ensure the loading of its uuid and PItem data
                    const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, entity);
                    if (!itemNamesToCoords.has(itemEntityWithData.itemData.name)) {
                        itemNamesToCoords.set(itemEntityWithData.itemData.name, []);
                    }
                    itemNamesToCoords
                        .get(itemEntityWithData.itemData.name)
                        .push(itemEntityWithData.entity.position);
                }
            }
            return itemNamesToCoords;
        });
    }
    getItemNamesToClosestCoords() {
        return __awaiter(this, void 0, void 0, function* () {
            const itemNamesToClosestCoords = new Map();
            const itemNamesToAllCoords = yield this.getItemNamesToAllCoords();
            for (const [itemName, coords] of itemNamesToAllCoords.entries()) {
                if (coords.length > 0) {
                    // Find the closest coordinate to the bot's position
                    const closestCoord = coords.reduce((closest, current) => {
                        return closest.distanceTo(this.bot.entity.position) <
                            current.distanceTo(this.bot.entity.position)
                            ? closest
                            : current;
                    });
                    itemNamesToClosestCoords.set(itemName, closestCoord);
                }
            }
            return itemNamesToClosestCoords;
        });
    }
    getItemNamesToCounts() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const itemNamesToCounts = new Map();
            for (const entity of this.vicinity.iterVisibleEntities()) {
                if (entity.name === "item") {
                    // Ensure the loading of its uuid and PItem data
                    const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, entity);
                    if (!itemNamesToCounts.has(itemEntityWithData.itemData.name)) {
                        itemNamesToCounts.set(itemEntityWithData.itemData.name, 0);
                    }
                    const hasItemCount = (item) => {
                        return item && typeof item === "object" && "itemCount" in item;
                    };
                    const itemCount = ((_a = itemEntityWithData.entity.metadata.find(hasItemCount)) === null || _a === void 0 ? void 0 : _a.itemCount) || 1;
                    itemNamesToCounts.set(itemEntityWithData.itemData.name, itemNamesToCounts.get(itemEntityWithData.itemData.name) + itemCount);
                }
            }
            return itemNamesToCounts;
        });
    }
    // ====================
    // Mob-related methods
    // ====================
    *getDistinctMobNames() {
        const alreadyYielded = new Set();
        for (const entity of this.vicinity.iterVisibleEntities()) {
            if (constants_1.MOB_ENTITY_TYPES.includes(entity.type) && entity.name) {
                if (!alreadyYielded.has(entity.name)) {
                    yield entity.name;
                    alreadyYielded.add(entity.name);
                }
            }
        }
    }
    getMobNamesToAllCoords() {
        const mobNamesToCoords = new Map();
        for (const entity of this.vicinity.iterVisibleEntities()) {
            if (constants_1.MOB_ENTITY_TYPES.includes(entity.type) && entity.name) {
                if (!mobNamesToCoords.has(entity.name)) {
                    mobNamesToCoords.set(entity.name, []);
                }
                mobNamesToCoords.get(entity.name).push(entity.position);
            }
        }
        return mobNamesToCoords;
    }
    getMobNamesToClosestCoords() {
        const mobNamesToClosestCoords = new Map();
        const mobNamesToAllCoords = this.getMobNamesToAllCoords();
        for (const [mobName, coords] of mobNamesToAllCoords.entries()) {
            if (coords.length > 0) {
                // Find the closest coordinate to the bot's position
                const closestCoord = coords.reduce((closest, current) => {
                    return closest.distanceTo(this.bot.entity.position) <
                        current.distanceTo(this.bot.entity.position)
                        ? closest
                        : current;
                });
                mobNamesToClosestCoords.set(mobName, closestCoord);
            }
        }
        return mobNamesToClosestCoords;
    }
    getMobNamesToCounts() {
        const mobNamesToCounts = new Map();
        for (const entity of this.vicinity.iterVisibleEntities()) {
            if (constants_1.MOB_ENTITY_TYPES.includes(entity.type) && entity.name) {
                if (!mobNamesToCounts.has(entity.name)) {
                    mobNamesToCounts.set(entity.name, 0);
                }
                mobNamesToCounts.set(entity.name, mobNamesToCounts.get(entity.name) + 1);
            }
        }
        return mobNamesToCounts;
    }
}
exports.VisibleVicinityContents = VisibleVicinityContents;
class Vicinity {
    constructor(bot, name, observer) {
        this.bot = bot;
        this.name = name;
        this.vicinitiesObserver = observer;
        this.distanceSortedOffsets = (0, classify_vicinity_1.getVicinitiesToDistanceSortedOffsets)(this.bot, this.vicinitiesObserver.radii).get(name);
        this.offsets = new Map(this.distanceSortedOffsets.map((offset) => [
            (0, generic_1.serializeVec3)(offset),
            offset,
        ]));
        this.visible = new VisibleVicinityContents(this.bot, this);
    }
    *iterVisibleBlocks() {
        for (const offset of this.vicinitiesObserver.visibleBlocks.iterOffsetsWithSetValues()) {
            if (this.offsets.has((0, generic_1.serializeVec3)(offset))) {
                const block = this.vicinitiesObserver.visibleBlocks.getFromOffset(offset);
                (0, assert_1.default)(block);
                yield block;
            }
        }
    }
    *iterVisibleEntities() {
        const voxelOfBotPos = this.bot.entity.position.floor();
        for (const entity of Object.values(this.bot.entities)) {
            const voxelOfPosition = entity.position.floor();
            const voxelOffsetOffPosition = voxelOfPosition.minus(voxelOfBotPos);
            if (this.offsets.has((0, generic_1.serializeVec3)(voxelOffsetOffPosition)) &&
                this.vicinitiesObserver.visibilityMask.getFromOffset(voxelOffsetOffPosition)) {
                yield entity;
            }
        }
    }
}
exports.Vicinity = Vicinity;
class ImmediateSurroundings extends Vicinity {
    getDTO() {
        return __awaiter(this, void 0, void 0, function* () {
            const visibleBlocks = {};
            for (const [blockName, allCoords,] of this.visible.getBlockNamesToAllCoords()) {
                visibleBlocks[blockName] = Array.from(allCoords).map((vec3) => [vec3.x, vec3.y, vec3.z]);
            }
            const visibleItems = {};
            for (const [itemName, coordsIterable,] of yield this.visible.getItemNamesToAllCoords()) {
                visibleItems[itemName] = Array.from(coordsIterable).map((vec3) => [vec3.x, vec3.y, vec3.z]);
            }
            return {
                visibleBlocks: visibleBlocks,
                visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
                visibleItems: visibleItems,
                visibleMobCounts: Object.fromEntries(this.visible.getMobNamesToCounts()),
            };
        });
    }
}
exports.ImmediateSurroundings = ImmediateSurroundings;
class DistantSurroundingsInADirection extends Vicinity {
    getDTO() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                visibleBlockCounts: Object.fromEntries(this.visible.getBlockNamesToCounts()),
                visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
                visibleItemCounts: Object.fromEntries(yield this.visible.getItemNamesToCounts()),
                visibleMobCounts: Object.fromEntries(this.visible.getMobNamesToCounts()),
            };
        });
    }
}
exports.DistantSurroundingsInADirection = DistantSurroundingsInADirection;

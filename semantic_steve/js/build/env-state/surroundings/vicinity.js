"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ImmediateSurroundings = exports.DistantSurroundingsInADirection = exports.Vicinity = exports.VisibleVicinityContents = exports.VicinitiesObserver = void 0;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const types_1 = require("../../types");
const generic_1 = require("../../utils/generic");
const classify_vicinity_1 = require("./classify-vicinity");
const misc_1 = require("../../utils/misc");
const visibility_raycaster_1 = require("./visibility-raycaster");
const orientation_1 = require("../../utils/orientation");
const item_entity_1 = require("../../utils/item-entity");
class VicinitiesObserver {
    constructor(bot, radii) {
        this.allSpawnedItemEntities = new Map();
        this.itemEntitiesGoneBeforeAdd = new Set();
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
            const fromEyeVoxel = (0, misc_1.getEyePos)(this.bot, fromBotPos).floor();
            const raycasts = [];
            try {
                for (var _d = true, _e = __asyncValues(this.visibilityRaycaster.doRaycasting(fromEyeVoxel)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const [vecNorm, pBlock] = _c;
                    const orientation = new orientation_1.ThreeDimOrientation(vecNorm);
                    const { phi, theta } = orientation.sphericalAngles;
                    let offset = null;
                    if (pBlock) {
                        offset = pBlock.position.minus(fromEyeVoxel);
                    }
                    raycasts.push([
                        {
                            phi,
                            theta,
                            hit: offset
                                ? {
                                    x: offset.x,
                                    y: offset.y,
                                    z: offset.z,
                                }
                                : null,
                        },
                    ]);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            fs.writeFileSync("raycasts.json", JSON.stringify(raycasts));
        });
    }
    beginObservation() {
        return __awaiter(this, void 0, void 0, function* () {
            // Do an initial complete observation cycle
            yield this.doObservationCycle(this.bot.entity.position);
            // // Start tracking entities that are already spawned
            // for (const entity of Object.values(this.bot.entities)) {
            //   if (entity.name === "item") {
            //     // Ensure the loading of its uuid and PItem data
            //     const itemEntityWithData = await ensureItemData(this.bot, entity);
            //     this.allSpawnedItemEntities.set(
            //       itemEntityWithData.entity.uuid!,
            //       itemEntityWithData
            //     );
            //   }
            // }
            // console.log(
            //   this.allSpawnedItemEntities.size,
            //   "item entities already spawned."
            // );
            // Setup listeners
            this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
            this.bot.on("move", this.handleBotMove.bind(this));
            // this.bot.on("entitySpawn", this.handleEntitySpawn.bind(this));
            // this.bot.on("entityGone", this.handleEntityGone.bind(this));
            // Not needed for now (unless the itemEntityWithData.entity.position doesn't self-update?):
            // this.bot.on("entityMoved", this.handleEntityMoved.bind(this));
        });
    }
    handleBotMove(newBotPos) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.visibilityRaycaster.isRaycasting) {
                yield this.doObservationCycle(newBotPos);
            }
        });
    }
    handleBlockUpdate(oldBlock, newBlock) {
        if (oldBlock && newBlock) {
            (0, assert_1.default)(oldBlock.position.equals(newBlock.position));
        } // I think this is always true since falling (moving) blocks are considered 'entities'
        // TODO: Implement
    }
}
exports.VicinitiesObserver = VicinitiesObserver;
class VisibleVicinityContents {
    constructor(bot, vicinity) {
        this.bot = bot;
        this.vicinity = vicinity;
    }
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
            const itemNamesToCounts = new Map();
            for (const itemEntity of this.vicinity.iterVisibleEntities()) {
                if (itemEntity.name === "item") {
                    // Ensure the loading of its uuid and PItem data
                    const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, itemEntity);
                    if (!itemNamesToCounts.has(itemEntityWithData.itemData.name)) {
                        itemNamesToCounts.set(itemEntityWithData.itemData.name, 0);
                    }
                    itemNamesToCounts.set(itemEntityWithData.itemData.name, itemNamesToCounts.get(itemEntityWithData.itemData.name) + 1);
                }
            }
            return itemNamesToCounts;
        });
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
        for (const entity of Object.values(this.bot.entities)) {
            const voxelOffsetOffPosition = entity.position.floor();
            if (this.offsets.has((0, generic_1.serializeVec3)(voxelOffsetOffPosition)) &&
                this.vicinitiesObserver.visibilityMask.getFromOffset(voxelOffsetOffPosition)) {
                yield entity;
            }
        }
    }
}
exports.Vicinity = Vicinity;
class DistantSurroundingsInADirection extends Vicinity {
    getDTO() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                visibleBlockCounts: Object.fromEntries(this.visible.getBlockNamesToCounts()),
                visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
                visibleItemCounts: Object.fromEntries(yield this.visible.getItemNamesToCounts()),
            };
        });
    }
}
exports.DistantSurroundingsInADirection = DistantSurroundingsInADirection;
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
            };
        });
    }
}
exports.ImmediateSurroundings = ImmediateSurroundings;

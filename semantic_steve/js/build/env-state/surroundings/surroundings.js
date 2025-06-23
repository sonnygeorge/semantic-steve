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
exports.Surroundings = exports.DistantSurroundingsInADirection = exports.ImmediateSurroundings = exports.BLOCKS_TO_IGNORE = void 0;
const assert_1 = __importDefault(require("assert"));
const immutable_1 = require("immutable");
const vec3_1 = require("vec3");
const vicinity_1 = require("./vicinity");
const cache_1 = require("./cache");
const chunk_1 = require("../../utils/chunk");
const visibility_1 = require("../../utils/visibility");
const item_entity_1 = require("../../utils/item-entity");
const misc_1 = require("../../utils/misc");
exports.BLOCKS_TO_IGNORE = ["air"];
/**
 * Full-detail data structure/object (used internally) that represents the VISIBLE contents
 * of the bot's immediate surroundings.
 */
class ImmediateSurroundings extends vicinity_1.VisibleVicinityContents {
    getDTO() {
        const visibleBlocks = {};
        for (const [blockName, coordsIterable] of this.getBlockNamesToAllCoords()) {
            visibleBlocks[blockName] = Array.from(coordsIterable).map((vec3) => [vec3.x, vec3.y, vec3.z]);
        }
        const visibleItems = {};
        for (const [itemName, coordsIterable] of this.getItemNamesToAllCoords()) {
            visibleItems[itemName] = Array.from(coordsIterable).map((vec3) => [vec3.x, vec3.y, vec3.z]);
        }
        return {
            visibleBlocks: visibleBlocks,
            visibleBiomes: Array.from(this.getDistinctBiomeNames()),
            visibleItems: visibleItems,
        };
    }
}
exports.ImmediateSurroundings = ImmediateSurroundings;
/**
 * Full-detail data structure/object (used internally) that represents the VISIBLE contents
 * of the bot's distant surroundings in a specific direction.
 */
class DistantSurroundingsInADirection extends vicinity_1.VisibleVicinityContents {
    getDTO() {
        return {
            visibleBlockCounts: Object.fromEntries(this.blockNamesToCounts),
            visibleBiomes: Array.from(this.getDistinctBiomeNames()),
            visibleItemCounts: Object.fromEntries(this.itemEntityNamesToCounts),
        };
    }
}
exports.DistantSurroundingsInADirection = DistantSurroundingsInADirection;
/**
 * Object that continually listens/caches/handles and exposes eagerly-loaded/handled
 * surroundings data
 */
class Surroundings {
    constructor(bot, radii) {
        this.entitesGoneBeforeCacheAdd = new Set(); // Defensive programming (probably not needed)
        // Private
        this.bot = bot;
        this.allEagerlyRetrievedBlocks = new cache_1.BlocksCache(bot);
        this.allSpawnedItemEntities = new cache_1.ItemEntitiesCache(bot);
        this.lastBotPosition = bot.entity.position.clone();
        this.getVicinityForPosition = vicinity_1.classifyVicinityOfPosition.bind(this, bot, radii.immediateSurroundingsRadius, radii.distantSurroundingsRadius);
        // Public
        this.radii = radii;
        this.immediate = new ImmediateSurroundings(bot);
        this.distant = new Map(Object.values(vicinity_1.Direction).map((dir) => [
            dir,
            new DistantSurroundingsInADirection(bot),
        ]));
        this.setupEventListeners();
    }
    // ===========
    // DTO getter
    // ===========
    getDTO() {
        return {
            immediateSurroundings: this.immediate.getDTO(),
            distantSurroundings: Object.fromEntries([...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])),
        };
    }
    // ================
    // Listeners setup
    // ================
    setupEventListeners() {
        // Set up listeners to monitor and eagerly handle PBlock loads, unloads, and updates.
        // NOTE: It is from PBlock data that we glean the BlockType and BiomeType info.
        this.bot.world.on("chunkColumnLoad", this.handleChunkLoad.bind(this));
        this.bot.world.on("chunkColumnUnload", this.handleChunkUnload.bind(this));
        this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
        // Set up listeners to monitor and eagerly handle PEntity spawns, despawns, and movements.
        this.bot.on("entitySpawn", this.handleEntitySpawn.bind(this));
        this.bot.on("entityGone", this.handleEntityGone.bind(this));
        this.bot.on("entityMoved", this.handleEntityMoved.bind(this));
        // Set up listeners to monitor and eagerly handle bot movements.
        this.bot.on("move", this.handleBotMovement.bind(this));
    }
    // ===============
    // Helpers: block
    // ===============
    classifyAndAddBlockToVicinityIfIsVisibleInOne(block) {
        var _a;
        const vicinity = this.getVicinityForPosition(block.position);
        if (!vicinity || !(0, visibility_1.isBlockVisible)(this.bot, block, block.position)) {
            // Not in any vicinity or not visible, so do nothing
        }
        else if (vicinity === vicinity_1.Vicinity.IMMEDIATE_SURROUNDINGS) {
            this.immediate.addBlock(block);
        }
        else {
            const direction = vicinity;
            (_a = this.distant.get(direction)) === null || _a === void 0 ? void 0 : _a.addBlock(block);
        }
    }
    removeBlockFromVicinityIfWasVisibleInOne(block) {
        const posKey = cache_1.BlocksCache.getKeyFromVec3(block.position);
        if (this.immediate.blocksLookup.has(posKey)) {
            this.immediate.removeBlock(block);
        }
        else {
            for (const distantSurroundingsInDir of this.distant.values()) {
                if (distantSurroundingsInDir.blocksLookup.has(posKey)) {
                    distantSurroundingsInDir.removeBlock(block);
                    break; // Done checking distant surroundings directions
                }
            }
        }
    }
    processNewlyLoadedBlock(block) {
        if (block instanceof vec3_1.Vec3) {
            block = this.bot.blockAt(block);
        }
        // Ignore blocks that we are not interested in
        if (!block || exports.BLOCKS_TO_IGNORE.includes(block.name))
            return;
        // 1. Add to cache
        this.allEagerlyRetrievedBlocks.set(cache_1.BlocksCache.getKeyFromVec3(block.position), block);
        // 2. If in a vicinity and visible, add to that vicinity
        this.classifyAndAddBlockToVicinityIfIsVisibleInOne(block);
    }
    processRemovalOfOldBlock(block) {
        // Reduce to a key string representing the block's position
        if (typeof block === "string") {
            // Already a key string
        }
        else if (block instanceof vec3_1.Vec3) {
            block = cache_1.BlocksCache.getKeyFromVec3(block);
        }
        else {
            block = cache_1.BlocksCache.getKeyFromVec3(block.position);
        }
        const storedBlock = this.allEagerlyRetrievedBlocks.get(block);
        if (!storedBlock) {
            // Block never stored in the first place, e.g., was in BLOCKS_TO_IGNORE
            return;
        }
        this.allEagerlyRetrievedBlocks.delete(block);
        this.removeBlockFromVicinityIfWasVisibleInOne(storedBlock);
    }
    // ==============
    // Helpers: item
    // ==============
    classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData) {
        var _a;
        (0, assert_1.default)(itemEntityWithData.entity.name === "item");
        (0, assert_1.default)(itemEntityWithData.entity.uuid);
        const vicinity = this.getVicinityForPosition(itemEntityWithData.entity.position);
        if (!vicinity ||
            !(0, visibility_1.areContentsOfCoordsVisible)(this.bot, itemEntityWithData.entity.position)) {
            // Not in any vicinity or not visible, so do nothing
        }
        else if (vicinity === vicinity_1.Vicinity.IMMEDIATE_SURROUNDINGS) {
            this.immediate.addItem(itemEntityWithData);
        }
        else {
            const direction = vicinity;
            (_a = this.distant.get(direction)) === null || _a === void 0 ? void 0 : _a.addItem(itemEntityWithData);
        }
    }
    removeItemFromVicinityIfWasVisibleInOne(itemEntityWithData) {
        (0, assert_1.default)(itemEntityWithData.entity.name === "item");
        (0, assert_1.default)(itemEntityWithData.entity.uuid);
        const uuid = itemEntityWithData.entity.uuid;
        if (this.immediate.itemsLookup.has(uuid)) {
            this.immediate.removeItem(itemEntityWithData);
        }
        else {
            for (const distantSurroundingsInDir of this.distant.values()) {
                if (distantSurroundingsInDir.itemsLookup.has(uuid)) {
                    distantSurroundingsInDir.removeItem(itemEntityWithData);
                    break; // Done checking distant surroundings directions
                }
            }
        }
    }
    processNewlySpawnedItemEntity(itemEntityWithData) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(itemEntityWithData.entity.name === "item");
            this.allSpawnedItemEntities.set(itemEntityWithData.entity.uuid, itemEntityWithData);
            this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
        });
    }
    processRemovalOfGoneItemEntity(itemEntityWithData) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(itemEntityWithData.entity.name === "item");
            (0, assert_1.default)(itemEntityWithData.entity.uuid);
            this.allSpawnedItemEntities.delete(itemEntityWithData.entity.uuid);
            this.removeItemFromVicinityIfWasVisibleInOne(itemEntityWithData);
        });
    }
    // ===============
    // Event handlers
    // ===============
    handleChunkLoad(chunkPos) {
        if (!(0, chunk_1.isChunkAtLeastPartiallyWithinRadius)(this.bot, chunkPos, this.radii.distantSurroundingsRadius)) {
            return;
        }
        (0, chunk_1.applyFuncToCoordsInChunk)(this.bot, this.processNewlyLoadedBlock.bind(this), chunkPos);
    }
    handleChunkUnload(chunkPos) {
        (0, chunk_1.applyFuncToCoordsInChunk)(this.bot, this.processRemovalOfOldBlock.bind(this), chunkPos);
    }
    handleBlockUpdate(oldBlock, newBlock) {
        if (oldBlock) {
            this.processRemovalOfOldBlock(oldBlock);
        }
        if (newBlock) {
            this.processNewlyLoadedBlock(newBlock);
        }
    }
    handleEntitySpawn(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (entity.name === "item") {
                // Ensure the loading of its uuid and PItem data
                const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, entity);
                // Defensive programming: If the entityGone somehow already happened before getting here...
                if (this.entitesGoneBeforeCacheAdd.has(itemEntityWithData.entity.uuid)) {
                    return; // Don't process this as a newly spawned item entity
                }
                else {
                    this.processNewlySpawnedItemEntity(itemEntityWithData);
                }
            }
        });
    }
    handleEntityGone(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (entity.name === "item") {
                // Ensure the loading of its uuid and PItem data
                const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, entity);
                // Defensive programming: If entityGone somehow happened before processing the spawn event...
                if (!this.allSpawnedItemEntities.has(itemEntityWithData.entity.uuid)) {
                    // Any spawned item entity with a UUID should have already been added to this cache...
                    // HOWEVER, on the off chance the event loop gets here before adding the entity...
                    // (which I don't *think* is possible/realistic?, but better safe than sorry!),
                    // let's prevent this UUID from ever being added if the event loop does try to do so later.
                    this.entitesGoneBeforeCacheAdd.add(itemEntityWithData.entity.uuid);
                }
                else {
                    this.processRemovalOfGoneItemEntity(itemEntityWithData);
                }
            }
        });
    }
    handleEntityMoved(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (entity.name === "item") {
                // Ensure the loading of its uuid and PItem data
                const itemEntityWithData = yield (0, item_entity_1.ensureItemData)(this.bot, entity);
                if (!this.allSpawnedItemEntities.has(itemEntityWithData.entity.uuid)) {
                    // Doing nothing here assumes that, by virtue of a weird event loop or event emission
                    // timing issue, we got here before the entity was added to the cache, and, when
                    // the new entity spawn occurs later, it will have an up-to-date position.
                    return;
                }
                else {
                    // The item should stay in the allSpawnedItemEntities cache (unlike with block updates,
                    // where we want to replace the old PBlock @ the coordinates in the cache).
                    // But, we do want to reclassify its visibility/vicinity and reinsert it back into the
                    // distance-to-bot-sorted AVL trees.
                    this.removeItemFromVicinityIfWasVisibleInOne(itemEntityWithData);
                    this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
                }
            }
        });
    }
    handleBotMovement() {
        const curBotPosition = this.bot.entity.position;
        const prevBotPosition = this.lastBotPosition;
        // Do nothing if magnitude of bot movement is negligible
        if (curBotPosition.equals(prevBotPosition))
            return;
        if (curBotPosition.distanceTo(prevBotPosition) < 0.2)
            return;
        console.log(`Bot moved from ${prevBotPosition} to ${curBotPosition}`);
        // Update last position
        this.lastBotPosition = curBotPosition.clone();
        // ==============================================================================
        // First, we need to eagerly load data for new blocks that have become in-radius
        // and unload data for blocks that have gone out-of-radius.
        // ==============================================================================
        let start = Date.now();
        let prevInRadiusCoords = (0, immutable_1.Set)();
        for (const coord of (0, misc_1.getAllCoordsWithinRadiusToPos)(this.bot, prevBotPosition, this.radii.distantSurroundingsRadius)) {
            prevInRadiusCoords = prevInRadiusCoords.add(cache_1.BlocksCache.getKeyFromVec3(coord));
        }
        let curInRadiusCoords = (0, immutable_1.Set)();
        for (const coord of (0, misc_1.getAllCoordsWithinRadiusToPos)(this.bot, curBotPosition, this.radii.distantSurroundingsRadius)) {
            curInRadiusCoords = curInRadiusCoords.add(cache_1.BlocksCache.getKeyFromVec3(coord));
        }
        console.log(`Time to compute in-radius coords: ${Date.now() - start}ms`);
        start = Date.now();
        // Remove from cache blocks that were in radius before but are not currently
        const noLongerInRadius = prevInRadiusCoords.subtract(curInRadiusCoords);
        for (const blockKey of noLongerInRadius) {
            this.allEagerlyRetrievedBlocks.delete(blockKey);
        }
        console.log(`Time to remove no longer in-radius blocks: ${Date.now() - start}ms`);
        start = Date.now();
        // Add to cache blocks that are now in radius but were not before
        const newlyInRadius = curInRadiusCoords.subtract(prevInRadiusCoords);
        for (const blockKey of newlyInRadius) {
            const blockPos = cache_1.BlocksCache.getVec3FromKey(blockKey);
            const block = this.bot.blockAt(blockPos);
            if (!block || exports.BLOCKS_TO_IGNORE.includes(block.name))
                continue;
            this.allEagerlyRetrievedBlocks.set(cache_1.BlocksCache.getKeyFromVec3(block.position), block);
        }
        console.log(`Time to add newly in-radius blocks: ${Date.now() - start}ms`);
        // =====================================================================================
        // Now, we need reclassify the vicinity/visiblity of everything that could potentially
        // now be visible in the surroundings.
        // To do this, let's recreate new vicinity objects from scratch (allowing the AVL trees
        // to be rebuilt based on new distances to the bot).
        // =====================================================================================
        this.immediate = new ImmediateSurroundings(this.bot);
        this.distant = new Map(Object.values(vicinity_1.Direction).map((dir) => [
            dir,
            new DistantSurroundingsInADirection(this.bot),
        ]));
        start = Date.now();
        // For blocks, we reconsider all blocks that are now in radius
        for (const coords of curInRadiusCoords) {
            const block = this.allEagerlyRetrievedBlocks.get(coords);
            if (!block)
                continue;
            this.classifyAndAddBlockToVicinityIfIsVisibleInOne(block);
        }
        console.log(`Time to reclassify blocks: ${Date.now() - start}ms`);
        start = Date.now();
        // For entities, we reconsider all spawned entities (theory being, it should not be too many)
        for (const itemEntityWithData of this.allSpawnedItemEntities.values()) {
            this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
        }
        console.log(`Time to reclassify item entities: ${Date.now() - start}ms`);
    }
}
exports.Surroundings = Surroundings;

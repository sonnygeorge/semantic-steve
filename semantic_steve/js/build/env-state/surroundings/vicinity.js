"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibleVicinityContents = exports.VicinitiesManager = exports.ImmediateSurroundings = exports.DistantSurroundingsInADirection = exports.Vicinity = void 0;
const assert_1 = __importDefault(require("assert"));
const common_1 = require("./common");
const visibility_raycast_manager_1 = require("./visibility-raycast-manager");
const voxel_space_around_bot_eyes_1 = require("./voxel-space-around-bot-eyes");
const get_vicinity_masks_1 = require("./get-vicinity-masks");
const misc_1 = require("../../utils/misc");
// The Main Idea(s):
// 1. Store stuff (blocks) in voxel space (3d arrays) which has implicit "distance" from bot & quick lookup with indices
// 2. Only do/manage N ongoing raycasts evenly distibuted over the possible eyeball orientations
//    => Allowing us to update only certain raycasts when we don't want to re-evaluate every raycast
// 3. Query/store blocks ONLY AFTER these managed raycasts confirm visibility
// Next TODO:
// - Implement the getters+DTOs (for blocks+biomes) and test like crazy!
// - Implement everything for itemEntityWithData
// - Clean up? Document? Maybe have
class Vicinity {
    constructor(bot, manager, name, mask) {
        this.bot = bot;
        this.manager = manager;
        this.name = name;
        this.mask = mask;
        this.visible = new VisibleVicinityContents(bot, this, manager);
    }
    *iterVisibleBlocks() {
        for (const offset of this.manager.visibleBlocks.iterOffsetsWithSetValues()) {
            if (this.mask.getFromOffset(offset)) {
                const block = this.manager.visibleBlocks.getFromOffset(offset);
                (0, assert_1.default)(block);
                yield block;
            }
        }
    }
}
exports.Vicinity = Vicinity;
class DistantSurroundingsInADirection extends Vicinity {
    getDTO() {
        return {
            visibleBlockCounts: {}, //Object.fromEntries(this.blockNamesToCounts),
            visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
            visibleItemCounts: {}, //Object.fromEntries(this.itemEntityNamesToCounts),
        };
    }
}
exports.DistantSurroundingsInADirection = DistantSurroundingsInADirection;
class ImmediateSurroundings extends Vicinity {
    getDTO() {
        const visibleBlocks = {};
        // for (const [blockName, coordsIterable] of this.getBlockNamesToAllCoords()) {
        //   visibleBlocks[blockName] = Array.from(coordsIterable).map(
        //     (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
        //   );
        // }
        const visibleItems = {};
        // for (const [itemName, coordsIterable] of this.getItemNamesToAllCoords()) {
        //   visibleItems[itemName] = Array.from(coordsIterable).map(
        //     (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
        //   );
        // }
        return {
            visibleBlocks: visibleBlocks,
            visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
            visibleItems: visibleItems,
        };
    }
}
exports.ImmediateSurroundings = ImmediateSurroundings;
const HANDLE_MOVEMENT_OVER = 0.1; // Minimum distance to move before updating raycasts
class VicinitiesManager {
    constructor(bot, radii) {
        this.botPosAsOfLastMoveHandling = null;
        this.bot = bot;
        this.radii = radii;
        this.raycastManager = new visibility_raycast_manager_1.VisibilityRaycastManager(bot, radii.distantSurroundingsRadius);
        const vicinityMasks = (0, get_vicinity_masks_1.getVicinityMasks)(bot, radii);
        this.immediate = new ImmediateSurroundings(bot, this, common_1.VicinityName.IMMEDIATE_SURROUNDINGS, vicinityMasks.get(common_1.VicinityName.IMMEDIATE_SURROUNDINGS));
        this.distant = new Map();
        for (const directionName of Object.values(common_1.DirectionName)) {
            // (DirectionName is a subset of VicinityName)
            const vicinityName = directionName;
            this.distant.set(directionName, new DistantSurroundingsInADirection(bot, this, vicinityName, vicinityMasks.get(vicinityName)));
        }
        this.visibleBlocks = new voxel_space_around_bot_eyes_1.VoxelSpaceAroundBotEyes(bot, radii.distantSurroundingsRadius, null // Default value for empty block spaces
        );
    }
    hydrateVisibleBlocks() {
        for (const offset of this.visibleBlocks.iterAllOffsets()) {
            if (this.raycastManager.visibilityMask.getFromOffset(offset)) {
                const block = this.bot.world.getBlock((0, misc_1.getVoxelOfPosition)(offset).add(this.bot.entity.position));
                if (block) {
                    this.visibleBlocks.setFromOffset(offset, block);
                }
            }
            else {
                this.visibleBlocks.unsetFromOffset(offset);
            }
        }
    }
    beginObservation() {
        const curEyePos = (0, misc_1.getCurEyePos)(this.bot);
        this.raycastManager.visibilityMask.setInitialEyePos(curEyePos);
        this.raycastManager.hitsOrganizedIntoVoxelSpace.setInitialEyePos(curEyePos);
        this.visibleBlocks.setInitialEyePos(curEyePos);
        this.raycastManager.updateRaycasts(curEyePos, "everywhere");
        this.hydrateVisibleBlocks();
        this.botPosAsOfLastMoveHandling = this.bot.entity.position.clone();
        // Setup listeners
        this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
        this.bot.on("move", this.handleBotMove.bind(this));
        // TODO: entity...
    }
    handleBlockUpdate(oldBlock, newBlock) {
        if (oldBlock && newBlock) {
            (0, assert_1.default)(oldBlock.position.equals(newBlock.position));
        } // I think this is always true since falling (moving) blocks are considered 'entities'
        const eyePos = this.raycastManager.visibilityMask.eyePosAtLastUpdate;
        (0, assert_1.default)(eyePos);
        const oldBlockWasVisible = oldBlock &&
            this.raycastManager.visibilityMask.getFromWorldPosition(oldBlock.position, eyePos);
        const newBlockIsVisible = newBlock &&
            this.raycastManager.visibilityMask.getFromWorldPosition(newBlock.position, eyePos);
        if (oldBlockWasVisible) {
            this.visibleBlocks.unsetFromWorldPosition(oldBlock.position, eyePos);
        }
        if (newBlockIsVisible) {
            this.visibleBlocks.setFromWorldPosition(newBlock.position, eyePos, newBlock);
        }
        if (oldBlockWasVisible && !newBlockIsVisible) {
            this.raycastManager.updateRaycasts(eyePos, {
                forWorldVoxel: (0, misc_1.getVoxelOfPosition)(oldBlock.position),
            });
        }
    }
    handleBotMove(newBotPosition) {
        (0, assert_1.default)(this.botPosAsOfLastMoveHandling);
        const curBotPosition = this.bot.entity.position;
        const prevBotPosition = this.botPosAsOfLastMoveHandling;
        // Do nothing if magnitude of bot movement is small enought that we don't want to process it
        if (curBotPosition.equals(prevBotPosition) ||
            curBotPosition.distanceTo(prevBotPosition) < HANDLE_MOVEMENT_OVER) {
            return;
        }
        this.botPosAsOfLastMoveHandling = curBotPosition.clone();
        const curEyePos = (0, misc_1.getCurEyePos)(this.bot);
        // Re-evaluate all visibility raycasts
        this.raycastManager.updateRaycasts(curEyePos, "everywhere");
        // Update the visibility mask's eye pos
        this.visibleBlocks.updateEyePosAndShiftAsNeeded(curEyePos);
        // Having updated this.visibleBlocks to the cur eye pos, we only need to update
        // this.visibleBlocks when it does not match up with the visibility mask.
        for (const offset of this.visibleBlocks.iterOffsetsWithSetValues()) {
            // Unset the blocks that are no longer visible
            if (!this.raycastManager.visibilityMask.getFromOffset(offset)) {
                this.visibleBlocks.unsetFromOffset(offset);
            }
        }
        for (const offset of this.raycastManager.visibilityMask.iterOffsetsWithSetValues()) {
            // Set the blocks that became visible
            if (!this.visibleBlocks.getFromOffset(offset)) {
                const worldPos = (0, misc_1.getVoxelOfPosition)(offset).add(this.bot.entity.position);
                const block = this.bot.world.getBlock(worldPos);
                if (block) {
                    this.visibleBlocks.setFromOffset(offset, block);
                } // Otherwise, it was likely an entity that was visible in this voxel (not a block)
            }
        }
    }
}
exports.VicinitiesManager = VicinitiesManager;
class VisibleVicinityContents {
    constructor(bot, vicinity, vicinityManager) {
        this.bot = bot;
        this.vicinity = vicinity;
        this.vicinityManager = vicinityManager;
    }
    // Block getters
    *getDistinctBlockNames() {
        const blockNames = new Set();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            if (block) {
                blockNames.add(block.name);
            }
        }
        return blockNames;
    }
    *getBlockNamesToClosestCoords() { }
    *getBlockNamesToAllCoords() { }
    // Biome getters
    *getDistinctBiomeNames() {
        const alreadyYielded = new Set();
        for (const block of this.vicinity.iterVisibleBlocks()) {
            (0, assert_1.default)(block);
            const biomeName = this.bot.registry.biomes[block.biome.id].name;
            if (!alreadyYielded.has(biomeName)) {
                yield biomeName;
                alreadyYielded.add(biomeName);
            }
        }
    }
    *getBiomeNamesToClosestCoords() { }
    *getBiomeNamesToAllCoords() { }
    // Item getters
    *getDistinctItemNames() { }
    *getItemNamesToClosestCoords() { }
    *getItemNamesToAllCoords() { }
}
exports.VisibleVicinityContents = VisibleVicinityContents;

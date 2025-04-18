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
exports.PathfindToBlock = void 0;
const assert_1 = __importDefault(require("assert"));
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const results_1 = require("../pathfind-to-coordinates/results");
const results_2 = require("./results");
const thing_1 = require("../../thing");
const skill_1 = require("../skill");
const block_1 = require("../../thing/block");
class PathfindToBlock extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.blockName = "";
        this.blockCoords = null;
        this.pathfindToCoordinates = new pathfind_to_coordinates_1.PathfindToCoordinates(bot, this.handlePathfindingResult.bind(this));
    }
    handlePathfindingResult(result, envStateIsHydrated) {
        (0, assert_1.default)(this.blockCoords);
        // Map PathfindToCoordinates results to our own result types
        if (result instanceof results_1.PathfindToCoordinatesResults.Success) {
            const successResult = new results_2.PathfindToBlockResults.Success(this.blockCoords, this.blockName);
            this.onResolution(successResult, envStateIsHydrated);
        }
        else if (result instanceof results_1.PathfindToCoordinatesResults.PartialSuccess) {
            const partialResult = new results_2.PathfindToBlockResults.PartialSuccess(this.bot.entity.position, this.blockCoords, this.blockName);
            this.onResolution(partialResult, envStateIsHydrated);
        }
        else {
            // For other result types, just pass them through
            this.onResolution(result, envStateIsHydrated);
        }
    }
    resolveBlockNotFound(blockName) {
        const result = new results_2.PathfindToBlockResults.BlockNotFound(blockName);
        this.onResolution(result);
    }
    resolveInvalidBlock(blockName) {
        const result = new results_2.PathfindToBlockResults.InvalidBlock(blockName);
        this.onResolution(result);
    }
    // ==================================
    // Implementation of Skill interface
    // ==================================
    invoke(blockName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.blockName = blockName;
            this.blockCoords = null;
            try {
                // Create the block entity to check if it's a valid thing type
                const block = this.bot.thingFactory.createThing(blockName, block_1.Block);
                // Ensure the block is actually a Block
                if (!(block instanceof block_1.Block)) {
                    this.resolveInvalidBlock(blockName);
                    return;
                }
                // Make sure we have fresh environment state data
                this.bot.envState.hydrate();
                // Check if the block is visible and get its coordinates
                const coords = yield block.locateNearest();
                if (!coords) {
                    // Block not found in surroundings
                    this.resolveBlockNotFound(blockName);
                    return;
                }
                // Store the block coordinates for use in result generation
                this.blockCoords = coords.clone();
                // Invoke pathfindToCoordinates with the block's coordinates
                yield this.pathfindToCoordinates.invoke([
                    coords.x,
                    coords.y,
                    coords.z
                ]);
            }
            catch (error) {
                if (error instanceof thing_1.InvalidThingError) {
                    this.resolveInvalidBlock(blockName);
                }
                else {
                    // Re-throw any other errors
                    throw error;
                }
            }
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Pausing '${PathfindToBlock.METADATA.name}'`);
            yield this.pathfindToCoordinates.pause();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Resuming '${PathfindToBlock.METADATA.name}'`);
            yield this.pathfindToCoordinates.resume();
        });
    }
}
exports.PathfindToBlock = PathfindToBlock;
PathfindToBlock.TIMEOUT_MS = 25000; // 25 seconds
PathfindToBlock.METADATA = {
    name: "pathfindToBlock",
    signature: "pathfindToBlock(blockName: string)",
    docstring: `
      /**
       * Attempt to pathfind to a specific block type if it is visible in the bot's surroundings.
       * If the block is not visible, the skill will fail immediately.
       * 
       * This skill is a specialized version of pathfindToCoordinates that only works
       * when a block with the given name is found in the bot's surroundings.
       * 
       * @param blockName - The name of the block to pathfind to (e.g., "stone", "oak_log").
       */
    `,
};

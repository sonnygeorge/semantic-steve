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
exports.PathfindToItem = void 0;
const assert_1 = __importDefault(require("assert"));
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const results_1 = require("../pathfind-to-coordinates/results");
const results_2 = require("./results");
const thing_1 = require("../../thing");
const skill_1 = require("../skill");
const types_1 = require("../../types");
class PathfindToItem extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.itemName = "";
        this.itemCoords = null;
        this.pathfindToCoordinates = new pathfind_to_coordinates_1.PathfindToCoordinates(bot, this.handlePathfindingResult.bind(this));
    }
    handlePathfindingResult(result, envStateIsHydrated) {
        (0, assert_1.default)(this.itemCoords);
        // Map PathfindToCoordinates results to our own result types
        if (result instanceof results_1.PathfindToCoordinatesResults.Success) {
            const successResult = new results_2.PathfindToItemResults.Success(this.itemCoords, this.itemName);
            this.onResolution(successResult, envStateIsHydrated);
        }
        else if (result instanceof results_1.PathfindToCoordinatesResults.PartialSuccess) {
            const partialResult = new results_2.PathfindToItemResults.PartialSuccess(this.bot.entity.position, this.itemCoords, this.itemName);
            this.onResolution(partialResult, envStateIsHydrated);
        }
        else {
            // For other result types, just pass them through
            this.onResolution(result, envStateIsHydrated);
        }
    }
    resolveItemNotFound(itemName) {
        const result = new results_2.PathfindToItemResults.ItemNotFound(itemName);
        this.onResolution(result);
    }
    resolveInvalidItem(itemName) {
        const result = new results_2.PathfindToItemResults.InvalidItem(itemName);
        this.onResolution(result);
    }
    // ==================================
    // Implementation of Skill interface
    // ==================================
    invoke(itemName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.itemName = itemName;
            this.itemCoords = null;
            try {
                // Create the item entity to check if it's a valid thing type
                const itemEntity = this.bot.thingFactory.createThing(itemName, thing_1.ItemEntity);
                // Ensure the item is actually an ItemEntity
                if (!(itemEntity instanceof thing_1.ItemEntity)) {
                    this.resolveInvalidItem(itemName);
                    return;
                }
                // Make sure we have fresh environment state data
                this.bot.envState.hydrate();
                // Check if the item is visible and get its coordinates
                const coords = yield itemEntity.locateNearest();
                if (!coords) {
                    // Item not found in surroundings
                    this.resolveItemNotFound(itemName);
                    return;
                }
                // Store the item coordinates for use in result generation
                this.itemCoords = coords.clone();
                // Invoke pathfindToCoordinates with the item's coordinates
                yield this.pathfindToCoordinates.invoke([coords.x, coords.y, coords.z]);
                yield new Promise((res, rej) => {
                    // await updateSlot event listener
                    const listener = (slot, oldItem, newItem) => {
                        // Check if the item in the slot is the one we are looking for
                        if (newItem && newItem.name === this.itemName) {
                            res(true); // Resolve the promise
                            this.bot.inventory.off("updateSlot", listener); // Remove the listener
                        }
                        else if (oldItem && oldItem.name === this.itemName) {
                            rej(new Error("Item was removed from inventory before reaching it."));
                            this.bot.inventory.off("updateSlot", listener); // Remove the listener
                        }
                    };
                    this.bot.inventory.on("updateSlot", listener);
                    setTimeout(() => {
                        rej(new Error("Timed out waiting for item to be picked up."));
                        this.bot.inventory.off("updateSlot", listener); // Remove the listener
                    }, PathfindToItem.TIMEOUT_MS);
                });
            }
            catch (error) {
                if (error instanceof types_1.InvalidThingError) {
                    this.resolveInvalidItem(itemName);
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
            console.log(`Pausing '${PathfindToItem.METADATA.name}'`);
            yield this.pathfindToCoordinates.pause();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Resuming '${PathfindToItem.METADATA.name}'`);
            yield this.pathfindToCoordinates.resume();
        });
    }
}
exports.PathfindToItem = PathfindToItem;
PathfindToItem.TIMEOUT_MS = 25000; // 25 seconds
PathfindToItem.METADATA = {
    name: "pathfindToItem",
    signature: "pathfindToItem(itemName: string)",
    docstring: `
      /**
       * Attempt to pathfind to a specific item if it is visible in the bot's surroundings.
       * If the item is not visible, the skill will fail immediately.
       *
       * This skill is a specialized version of pathfindToCoordinates that only works
       * when an item with the given name is found in the bot's surroundings.
       *
       * @param itemName - The name of the item to pathfind to (e.g., "diamond", "apple").
       */
    `,
};

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
exports.PickupItem = void 0;
const assert_1 = __importDefault(require("assert"));
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const approach_1 = require("../approach/approach");
const results_1 = require("../approach/results");
const surroundings_1 = require("../../env-state/surroundings");
const results_2 = require("./results");
const thing_type_1 = require("../../thing-type");
const skill_1 = require("../skill");
const types_1 = require("../../types");
const constants_1 = require("../../constants");
const generic_1 = require("../../utils/generic");
const results_3 = require("../pathfind-to-coordinates/results");
class PickupItem extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
    }
    resolveFromSubskillResolution(result) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.itemEntity);
            (0, assert_1.default)(this.activeSubskill);
            this.activeSubskill = undefined;
            // Propogate result if we are resolving from Approach
            if ((0, results_1.isApproachResult)(result)) {
                this.resolve(result);
                return;
            }
            // Otherwise, we are resolving from PathfindToCoordinates
            (0, assert_1.default)(this.itemTotalAtPathingStart !== undefined);
            (0, assert_1.default)(this.targetItemCoords);
            const vicinityOfOriginalTargetCoords = this.bot.envState.surroundings.getVicinityForPosition(this.targetItemCoords);
            if (vicinityOfOriginalTargetCoords !== surroundings_1.Vicinity.IMMEDIATE_SURROUNDINGS) {
                const result = new results_2.PickupItemResults.TargetCoordsNoLongerInImmediateSurroundings(this.itemEntity.name);
                this.resolve(result);
                return;
            }
            // Wait for a bit to make sure the item is picked up
            yield (0, generic_1.asyncSleep)(constants_1.ITEM_PICKUP_WAIT_MS);
            if (result instanceof results_3.PathfindToCoordinatesResults.Success) {
                const curItemTotal = this.itemEntity.getTotalCountInInventory();
                const netItemGain = curItemTotal - this.itemTotalAtPathingStart;
                const result = new results_2.PickupItemResults.SuccessImmediateSurroundings(this.itemEntity.name, netItemGain);
                this.resolve(result);
            }
            else {
                const result = new results_2.PickupItemResults.CouldNotProgramaticallyVerify(this.itemEntity.name);
                this.resolve(result);
            }
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(item, direction) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate the item string
            if (typeof item === "string") {
                try {
                    this.itemEntity = new thing_type_1.ItemType(this.bot, item);
                }
                catch (err) {
                    if (err instanceof types_1.InvalidThingError) {
                        const result = new results_2.PickupItemResults.InvalidItem(item);
                        this.resolve(result);
                        return;
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
                this.itemEntity = item;
            }
            if (direction) {
                // If a direction is provided, we can just use/invoke approach
                this.activeSubskill = new approach_1.Approach(this.bot, this.resolveFromSubskillResolution.bind(this));
                this.activeSubskill.invoke(this.itemEntity, direction);
            }
            else {
                // Else, we need to pathfind to the item in the immediate surroundings
                this.targetItemCoords =
                    yield this.itemEntity.locateNearestInImmediateSurroundings();
                if (!this.targetItemCoords) {
                    const result = new results_2.PickupItemResults.NotInImmediateSurroundings(this.itemEntity.name);
                    this.resolve(result);
                    return;
                }
                this.itemTotalAtPathingStart = this.itemEntity.getTotalCountInInventory();
                // Invoke pathfindToCoordinates
                this.activeSubskill = new pathfind_to_coordinates_1.PathfindToCoordinates(this.bot, this.resolveFromSubskillResolution.bind(this));
                yield this.activeSubskill.invoke(this.targetItemCoords);
            }
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.activeSubskill) {
                yield this.activeSubskill.pause();
            }
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.activeSubskill) {
                yield this.activeSubskill.resume();
            }
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.activeSubskill) {
                yield this.activeSubskill.stop();
                this.activeSubskill = undefined;
            }
        });
    }
}
exports.PickupItem = PickupItem;
PickupItem.TIMEOUT_MS = 23000; // 23 seconds
PickupItem.METADATA = {
    name: "pickupItem",
    signature: "pickupItem(item: string, direction?: string)",
    docstring: `
      /**
       * Attempt to walk over to an item and pick it up. Requires that the item be visible
       * in the bot's immediate or distant surroundings.
       *
       * @param item - The name of the item to pick up (e.g., "diamond", "apple").
       * @param direction - Must be provided if you want to pick up an item from the
       * distant surroundings. The direction of the distant surroundings in which the item
       * is located.
       */
    `,
};

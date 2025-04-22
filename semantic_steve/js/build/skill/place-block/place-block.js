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
exports.PlaceBlock = void 0;
const assert_1 = __importDefault(require("assert"));
const skill_1 = require("../skill");
const vec3_1 = require("vec3");
const results_1 = require("./results");
const results_2 = require("../get-placeable-coordinates/results");
const thing_1 = require("../../thing");
const types_1 = require("../../types");
const generic_1 = require("../../utils/generic");
const placing_1 = require("../../utils/placing");
const constants_1 = require("../../constants");
class PlaceBlock extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.shouldBePlacing = false;
    }
    resolvePlacing(result) {
        this.shouldBePlacing = false;
        this.blockToPlace = undefined;
        this.targetPosition = undefined;
        this.itemToPlace = undefined;
        this.resolve(result);
    }
    doPlacing() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.blockToPlace);
            (0, assert_1.default)(this.targetPosition);
            (0, assert_1.default)(this.itemToPlace);
            const referenceBlockAndFaceVector = (0, placing_1.getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable)(this.bot, this.targetPosition);
            if (!referenceBlockAndFaceVector) {
                const result = new results_1.PlaceBlockResults.UnplaceableCoords(`${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`);
                this.resolvePlacing(result);
                return;
            }
            if (this.shouldBePlacing) {
                yield this.bot.equip(this.itemToPlace, "hand");
            }
            if (this.shouldBePlacing) {
                yield this.bot.placeBlock(referenceBlockAndFaceVector[0], referenceBlockAndFaceVector[1]);
            }
            // Wait for things to settle (e.g., gravel to fall)
            yield (0, generic_1.asyncSleep)(constants_1.BLOCK_PLACEMENT_WAIT_MS);
            // If we got here, we know that, at invocation time, no block was at the target
            // coordinates. Therefore, we consider the correct block existing at the target
            // coordinates as a placement success.
            if (this.shouldBePlacing) {
                const blockAtTargetCoords = this.bot.blockAt(this.targetPosition);
                if (!blockAtTargetCoords ||
                    blockAtTargetCoords.name !== this.blockToPlace.name) {
                    this.resolvePlacing(new results_1.PlaceBlockResults.PlacingFailure(this.blockToPlace.name, `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`));
                }
                else {
                    this.resolvePlacing(new results_1.PlaceBlockResults.Success(this.blockToPlace.name, `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`));
                }
            }
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(block, atCoordinates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.blockToPlace = new thing_1.Block(this.bot, block);
            }
            catch (err) {
                if (err instanceof types_1.InvalidThingError) {
                    this.resolvePlacing(new results_1.PlaceBlockResults.InvalidBlock(block));
                    return;
                }
                throw err;
            }
            this.itemToPlace = this.bot.inventory.items().find((item) => {
                // This assert is obviously true (above), but TS compiler doesn't know this
                (0, assert_1.default)(this.blockToPlace !== undefined);
                return item.name === this.blockToPlace.name;
            });
            if (!this.itemToPlace) {
                this.resolvePlacing(new results_1.PlaceBlockResults.BlockNotInInventory(block));
                return;
            }
            if (!atCoordinates) {
                this.targetPosition = (0, placing_1.getPlaceableCoords)(this.bot);
                if (!this.targetPosition) {
                    this.resolvePlacing(new results_2.GetPlaceableCoordinatesResults.NoPlaceableCoords());
                    return;
                }
            }
            else {
                this.targetPosition = new vec3_1.Vec3(atCoordinates[0], atCoordinates[1], atCoordinates[2]);
            }
            this.shouldBePlacing = true;
            yield this.doPlacing();
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shouldBePlacing = false;
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.blockToPlace);
            (0, assert_1.default)(this.targetPosition);
            (0, assert_1.default)(this.itemToPlace);
            this.shouldBePlacing = true;
            yield this.doPlacing();
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shouldBePlacing = false;
            this.blockToPlace = undefined;
            this.targetPosition = undefined;
            this.itemToPlace = undefined;
        });
    }
}
exports.PlaceBlock = PlaceBlock;
PlaceBlock.TIMEOUT_MS = 4000; // 4 seconds
PlaceBlock.METADATA = {
    name: "placeBlock",
    signature: "placeBlock(block: string, atCoordinates?: [number, number, number])",
    docstring: `
        /**
         * Places a block.
         *
         * @param block - The block to place.
         * @param atCoordinates - Optional target coordinates for block placement.
         */
      `,
};

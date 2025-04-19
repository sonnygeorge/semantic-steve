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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlaceableCoordinates = void 0;
const skill_1 = require("../skill");
const results_1 = require("./results");
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const utils_2 = require("../../utils");
class GetPlaceableCoordinates extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
    }
    invoke() {
        return __awaiter(this, void 0, void 0, function* () {
            const placeableCoords = [];
            const botPosition = this.bot.entity.position.floored();
            const radius = constants_1.MAX_PLACEMENT_REACH + 1;
            // Iterate through all blocks within the radius
            for (let x = -radius; x <= radius; x++) {
                for (let y = -radius; y <= radius; y++) {
                    for (let z = -radius; z <= radius; z++) {
                        const coords = botPosition.offset(x, y, z);
                        // Skip coordinates the bot is currently occupying
                        if ((0, utils_2.isBotOccupyingCoords)(this.bot, coords)) {
                            continue;
                        }
                        // Check if the coordinates are placeable
                        const refernceBlockAndFaceVector = (0, utils_1.getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable)(this.bot, coords);
                        if (refernceBlockAndFaceVector !== undefined) {
                            placeableCoords.push(coords);
                        }
                    }
                }
            }
            const result = new results_1.GetPlaceableCoordinatesResults.Success(placeableCoords);
            this.onResolution(result);
        });
    }
    // These don't need to do anything since invoke never gives up the event loop
    pause() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
exports.GetPlaceableCoordinates = GetPlaceableCoordinates;
GetPlaceableCoordinates.TIMEOUT_MS = 2000; // 2 seconds
GetPlaceableCoordinates.METADATA = {
    name: "getPlaceableCoordinates",
    signature: "getPlaceableCoordinates()",
    docstring: `
          /**
           * Gets the coordinates at which it is currently possible to place a block.
           */
        `,
};

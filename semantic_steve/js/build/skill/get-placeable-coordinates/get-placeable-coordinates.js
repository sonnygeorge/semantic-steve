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
const placing_1 = require("../../utils/placing");
class GetPlaceableCoordinates extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke() {
        return __awaiter(this, void 0, void 0, function* () {
            const placeableCoords = (0, placing_1.getAllPlaceableCoords)(this.bot);
            if (placeableCoords.length === 0) {
                const result = new results_1.GetPlaceableCoordinatesResults.NoPlaceableCoords();
                this.resolve(result);
            }
            else {
                const result = new results_1.GetPlaceableCoordinatesResults.Success(placeableCoords);
                this.resolve(result);
            }
        });
    }
    // These will never get called since this skill never gives up the event loop.
    // Nevertheless, we need to implement them to satisfy the Skill ABC.
    doPause() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    doStop() {
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

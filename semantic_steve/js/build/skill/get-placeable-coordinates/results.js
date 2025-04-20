"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlaceableCoordinatesResults = void 0;
var GetPlaceableCoordinatesResults;
(function (GetPlaceableCoordinatesResults) {
    class Success {
        constructor(placeableCoords) {
            const placeableCoordsString = placeableCoords
                .map((vec) => `[${vec.x}, ${vec.y}, ${vec.z}]`)
                .join(", ");
            this.message = `Currently, these are the coordinates at which a block can be placed: [${placeableCoordsString}]`;
        }
    }
    GetPlaceableCoordinatesResults.Success = Success;
    class NoPlaceableCoords {
        constructor() {
            this.message =
                "Currently, there are no coordinates at which a block can be placed. Perhaps the bot is in a 1x1 hole or some other tight space.";
        }
    }
    GetPlaceableCoordinatesResults.NoPlaceableCoords = NoPlaceableCoords;
})(GetPlaceableCoordinatesResults || (exports.GetPlaceableCoordinatesResults = GetPlaceableCoordinatesResults = {}));

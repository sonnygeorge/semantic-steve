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
})(GetPlaceableCoordinatesResults || (exports.GetPlaceableCoordinatesResults = GetPlaceableCoordinatesResults = {}));

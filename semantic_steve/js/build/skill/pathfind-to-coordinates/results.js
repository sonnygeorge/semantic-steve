"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathfindToCoordinatesResults = void 0;
var PathfindToCoordinatesResults;
(function (PathfindToCoordinatesResults) {
    class InvalidThing {
        constructor(thing, supportedThingTypes) {
            this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be stopped at if found: ${supportedThingTypes}.`;
        }
    }
    PathfindToCoordinatesResults.InvalidThing = InvalidThing;
    class InvalidCoords {
        constructor(coords) {
            const coordsString = `[${coords[0]}, ${coords[1]}, ${coords[2]}]`;
            this.message = `SkillInvocationError: '${coordsString}' is not a valid coordinates array. Expected an array of three numbers ordered as [x, y, z].`;
        }
    }
    PathfindToCoordinatesResults.InvalidCoords = InvalidCoords;
    class FoundThingInImmediateSurroundings {
        constructor(targetCoords, foundThingName) {
            const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
            this.message = `Your pathfinding to or near ${targetCoordsString} was terminated early since '${foundThingName}' was found visible in the immediate surroundings.`;
        }
    }
    PathfindToCoordinatesResults.FoundThingInImmediateSurroundings = FoundThingInImmediateSurroundings;
    class FoundThingInDistantSurroundings {
        constructor(targetCoords, foundThingName) {
            const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
            this.message = `Your pathfinding to or near ${targetCoordsString} was terminated early since '${foundThingName}' was found visible in the distant surroundings.`;
        }
    }
    PathfindToCoordinatesResults.FoundThingInDistantSurroundings = FoundThingInDistantSurroundings;
    class PartialSuccess {
        constructor(reachedCoords, targetCoords) {
            const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
            const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
            this.message = `You were only able to reach ${reachedCoordsString} and ${targetCoordsString} is not in your immediate surroundings.`;
            // TODO: Is it possible to add layman-understandable reasons to this?
            // E.g., "because these blocks were impeding the way: '{impedingBlockNames}'"...
            // ...allowing the LLM to reason that, if it really wanted to proceeed towards these
            // coords, it might want to acquire a tool that is better fit for breaking such blocks.
        }
    }
    PathfindToCoordinatesResults.PartialSuccess = PartialSuccess;
    class Success {
        constructor(targetCoords) {
            const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
            this.message = `You were able to successfully pathfind to or near ${targetCoordsString} such that these coordinates are now in your immediate surroundings.`;
        }
    }
    PathfindToCoordinatesResults.Success = Success;
})(PathfindToCoordinatesResults || (exports.PathfindToCoordinatesResults = PathfindToCoordinatesResults = {}));

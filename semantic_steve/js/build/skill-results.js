"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeScreenshotOfResults = exports.ApproachResults = exports.PathfindToCoordinatesResults = exports.GenericSkillResults = void 0;
var GenericSkillResults;
(function (GenericSkillResults) {
    class SkillNotFound {
        constructor(skillName) {
            this.message = `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`;
        }
    }
    GenericSkillResults.SkillNotFound = SkillNotFound;
    class UnhandledRuntimeError {
        constructor(skillName, error) {
            const errorString = error.toString();
            this.message = `SkillRuntimeError: An unexpected/unhandled error occurred while attempting to execute '${skillName}': ${errorString}`;
        }
    }
    GenericSkillResults.UnhandledRuntimeError = UnhandledRuntimeError;
    class DeathDuringExecution {
        constructor() {
            this.message = `For some reason, while executing your last skill, you died. This is your new state after respawning.`;
        }
    }
    GenericSkillResults.DeathDuringExecution = DeathDuringExecution;
    class DeathWhileAwaitingInvocation {
        constructor(skillName) {
            this.message = `For some reason, before your skill could be invoked, you died. Since death results in a respawn (changed state), the invocation '${skillName}' was never attempted. This is your new state after respawning.`;
        }
    }
    GenericSkillResults.DeathWhileAwaitingInvocation = DeathWhileAwaitingInvocation;
})(GenericSkillResults || (exports.GenericSkillResults = GenericSkillResults = {}));
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
            this.message = `You were only able to pathfind to ${reachedCoordsString} and not ${targetCoordsString}.`;
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
            this.message = `You were able to successfully pathfind to or near ${targetCoordsString} (such that these coordinates are now in your immediate surroundings).`;
        }
    }
    PathfindToCoordinatesResults.Success = Success;
})(PathfindToCoordinatesResults || (exports.PathfindToCoordinatesResults = PathfindToCoordinatesResults = {}));
var ApproachResults;
(function (ApproachResults) {
    class InvalidThing {
        constructor(thing, supportedThingTypes) {
            this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be approached: ${supportedThingTypes}.`;
        }
    }
    ApproachResults.InvalidThing = InvalidThing;
    class ThingNotInDistantSurroundings {
        constructor(thing) {
            this.message = `SkillInvocationError: '${thing}' not found in your distant surroundings. A thing must be visible in your distant surroundings in order to be approached.`;
        }
    }
    ApproachResults.ThingNotInDistantSurroundings = ThingNotInDistantSurroundings;
    class ThingNotInDistantSurroundingsDirection {
        constructor(thing, direction) {
            this.message = `SkillInvocationError: '${thing}' not found in your distant surroundings ${direction} direction. The thing you want to approach must be visible in the specified direction of your distant surroundings.`;
        }
    }
    ApproachResults.ThingNotInDistantSurroundingsDirection = ThingNotInDistantSurroundingsDirection;
    class Success {
        constructor(approachedThing) {
            this.message = `You successfully approached '${approachedThing}'. It should now be present in your immediate surroundings.`;
        }
    }
    ApproachResults.Success = Success;
    class SuccessDirection {
        constructor(thing, direction) {
            this.message = `You successfully approached '${thing}' from the '${direction}' direction. '${thing}' should now be present in your immediate surroundings.`;
        }
    }
    ApproachResults.SuccessDirection = SuccessDirection;
    class Failure {
        constructor(thing, pathfindingPartialSuccessResult) {
            this.message = `You were unable to approach thing '${thing}'. ${pathfindingPartialSuccessResult}`;
        }
    }
    ApproachResults.Failure = Failure;
})(ApproachResults || (exports.ApproachResults = ApproachResults = {}));
var TakeScreenshotOfResults;
(function (TakeScreenshotOfResults) {
    class InvalidThing {
        constructor(thing, supportedThingTypes) {
            this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only screenshot of these varieties of things can be taken: ${supportedThingTypes}.`;
        }
    }
    TakeScreenshotOfResults.InvalidThing = InvalidThing;
    class ThingNotInImmediateSurroundings {
        constructor(thing) {
            this.message = `SkillInvocationError: '${thing}' not found in your immediate surroundings. A thing must be visible in your immediate surroundings in order to take a screenshot of it.`;
        }
    }
    TakeScreenshotOfResults.ThingNotInImmediateSurroundings = ThingNotInImmediateSurroundings;
    class CoordinatesNotInImmediateSurroundings {
        constructor(thing) {
            this.message = `SkillInvocationError: the coordinates specifying the location of the '${thing}' to take a screenshot of are not visible in your immediate surroundings.`;
        }
    }
    TakeScreenshotOfResults.CoordinatesNotInImmediateSurroundings = CoordinatesNotInImmediateSurroundings;
    class Success {
        constructor(thing, filePath) {
            this.message = `You successfully took a screenshot of '${thing}'. The screenshot has been saved to file path: '${filePath}'.`;
        }
    }
    TakeScreenshotOfResults.Success = Success;
})(TakeScreenshotOfResults || (exports.TakeScreenshotOfResults = TakeScreenshotOfResults = {}));

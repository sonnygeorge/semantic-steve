"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeScreenshotOfResults = void 0;
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
    class InvalidCoords {
        constructor(thing) {
            this.message = `SkillInvocationError: The provided coordinates were either not visible in your immediate surroundings or a '${thing}' did not exist at that location.`;
        }
    }
    TakeScreenshotOfResults.InvalidCoords = InvalidCoords;
    class Success {
        constructor(thing, filePath) {
            this.message = `You successfully took a screenshot of '${thing}'. The screenshot has been saved to file path: '${filePath}'.`;
        }
    }
    TakeScreenshotOfResults.Success = Success;
    class Failed {
        constructor(thing) {
            this.message = `SkillInvocationError: Failed to take a screenshot of '${thing}'.`;
        }
    }
    TakeScreenshotOfResults.Failed = Failed;
})(TakeScreenshotOfResults || (exports.TakeScreenshotOfResults = TakeScreenshotOfResults = {}));

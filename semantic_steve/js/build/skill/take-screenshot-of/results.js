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

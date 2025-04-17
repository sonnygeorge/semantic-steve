"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproachResults = void 0;
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

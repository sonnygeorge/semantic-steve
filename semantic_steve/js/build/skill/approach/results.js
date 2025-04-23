"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproachResults = void 0;
exports.isApproachResult = isApproachResult;
var ApproachResults;
(function (ApproachResults) {
    class InvalidThing {
        constructor(thing, supportedThingTypes) {
            this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be approached: ${supportedThingTypes}.`;
        }
    }
    ApproachResults.InvalidThing = InvalidThing;
    class InvalidDirection {
        constructor(direction) {
            this.message = `SkillInvocationError: '${direction}' is not a valid specification of a direction in the distant surroundings.`;
        }
    }
    ApproachResults.InvalidDirection = InvalidDirection;
    class ThingNotInDistantSurroundingsDirection {
        constructor(thing, direction) {
            this.message = `SkillInvocationError: '${thing}' not found in your distant surroundings ${direction} direction. The thing you want to approach must be visible in the specified direction of your distant surroundings.`;
        }
    }
    ApproachResults.ThingNotInDistantSurroundingsDirection = ThingNotInDistantSurroundingsDirection;
    class Success {
        constructor(thing, direction) {
            this.message = `You successfully approached '${thing}' from the '${direction}' direction. '${thing}' should now be present in your immediate surroundings.`;
        }
    }
    ApproachResults.Success = Success;
    class SuccessItemEntity {
        constructor(itemName, direction, netItemGain) {
            this.message = `You successfully approached '${itemName}' from the '${direction}' direction and, while doing so, gained a net of ${netItemGain} of '${itemName}' items.`;
        }
    }
    ApproachResults.SuccessItemEntity = SuccessItemEntity;
    class Failure {
        constructor(thing) {
            this.message = `You were unable to approach thing '${thing}'.`;
        }
    }
    ApproachResults.Failure = Failure;
    class FoundThingInImmediateSurroundings {
        constructor(thing, foundThingName) {
            this.message = `Your approach to '${thing}' was terminated early since '${foundThingName}' was found visible in the immediate surroundings.`;
        }
    }
    ApproachResults.FoundThingInImmediateSurroundings = FoundThingInImmediateSurroundings;
    class FoundThingInDistantSurroundings {
        constructor(thing, foundThingName) {
            this.message = `Your approach to '${thing}' was terminated early since '${foundThingName}' was found visible in the distant surroundings.`;
        }
    }
    ApproachResults.FoundThingInDistantSurroundings = FoundThingInDistantSurroundings;
})(ApproachResults || (exports.ApproachResults = ApproachResults = {}));
function isApproachResult(result) {
    return (result instanceof ApproachResults.InvalidThing ||
        result instanceof ApproachResults.InvalidDirection ||
        result instanceof ApproachResults.ThingNotInDistantSurroundingsDirection ||
        result instanceof ApproachResults.Success ||
        result instanceof ApproachResults.SuccessItemEntity ||
        result instanceof ApproachResults.Failure ||
        result instanceof ApproachResults.FoundThingInImmediateSurroundings ||
        result instanceof ApproachResults.FoundThingInDistantSurroundings);
}

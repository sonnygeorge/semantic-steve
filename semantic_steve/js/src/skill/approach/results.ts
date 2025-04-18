import { SkillResult } from "../../types";

export namespace ApproachResults {
  export class InvalidThing implements SkillResult {
    message: string;
    constructor(thing: string, supportedThingTypes: string) {
      this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be approached: ${supportedThingTypes}.`;
    }
  }

  export class InvalidDirection implements SkillResult {
    message: string;
    constructor(direction: string) {
      this.message = `SkillInvocationError: '${direction}' is not a valid specification of a direction in the distant surroundings.`;
    }
  }

  export class ThingNotInDistantSurroundingsDirection implements SkillResult {
    message: string;
    constructor(thing: string, direction: string) {
      this.message = `SkillInvocationError: '${thing}' not found in your distant surroundings ${direction} direction. The thing you want to approach must be visible in the specified direction of your distant surroundings.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(thing: string, direction: string) {
      this.message = `You successfully approached '${thing}' from the '${direction}' direction. '${thing}' should now be present in your immediate surroundings.`;
    }
  }

  export class Failure implements SkillResult {
    message: string;
    constructor(thing: string, pathfindingPartialSuccessResult: string) {
      this.message = `You were unable to approach thing '${thing}'.`;
    }
  }

  export class FoundThingInImmediateSurroundings implements SkillResult {
    message: string;
    constructor(thing: string, foundThingName: string) {
      this.message = `Your approach to '${thing}' was terminated early since '${foundThingName}' was found visible in the immediate surroundings.`;
    }
  }

  export class FoundThingInDistantSurroundings implements SkillResult {
    message: string;
    constructor(thing: string, foundThingName: string) {
      this.message = `Your approach to '${thing}' was terminated early since '${foundThingName}' was found visible in the distant surroundings.`;
    }
  }
}

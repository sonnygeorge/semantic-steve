import { SkillResult } from "../../skill-results";

export namespace ApproachResults {
  export class InvalidThing implements SkillResult {
    message: string;
    constructor(thing: string, supportedThingTypes: string) {
      this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be approached: ${supportedThingTypes}.`;
    }
  }

  export class ThingNotInDistantSurroundings implements SkillResult {
    message: string;
    constructor(thing: string) {
      this.message = `SkillInvocationError: '${thing}' not found in your distant surroundings. A thing must be visible in your distant surroundings in order to be approached.`;
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
    constructor(approachedThing: string) {
      this.message = `You successfully approached '${approachedThing}'. It should now be present in your immediate surroundings.`;
    }
  }

  export class SuccessDirection implements SkillResult {
    message: string;
    constructor(thing: string, direction: string) {
      this.message = `You successfully approached '${thing}' from the '${direction}' direction. '${thing}' should now be present in your immediate surroundings.`;
    }
  }

  export class Failure implements SkillResult {
    message: string;
    constructor(thing: string, pathfindingPartialSuccessResult: string) {
      this.message = `You were unable to approach thing '${thing}'. ${pathfindingPartialSuccessResult}`;
    }
  }
}

import { SkillResult } from "../../types";

export namespace TakeScreenshotOfResults {
  export class InvalidThing implements SkillResult {
    message: string;
    constructor(thing: string, supportedThingTypes: string) {
      this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only screenshot of these varieties of things can be taken: ${supportedThingTypes}.`;
    }
  }

  export class ThingNotInImmediateSurroundings implements SkillResult {
    message: string;
    constructor(thing: string) {
      this.message = `SkillInvocationError: '${thing}' not found in your immediate surroundings. A thing must be visible in your immediate surroundings in order to take a screenshot of it.`;
    }
  }

  export class InvalidCoords implements SkillResult {
    message: string;
    constructor(thing: string) {
      this.message = `SkillInvocationError: The provided coordinates were either not visible in your immediate surroundings or a '${thing}' did not exist at that location.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(thing: string, filePath: string) {
      this.message = `You successfully took a screenshot of '${thing}'. The screenshot has been saved to file path: '${filePath}'.`;
    }
  }

  export class Failed implements SkillResult {
    message: string;
    constructor(thing: string) {
      this.message = `SkillInvocationError: Failed to take a screenshot of '${thing}'.`;
    }
  }
}

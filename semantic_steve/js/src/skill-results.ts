import { Vec3 } from "vec3";

export interface SkillResult {
  message: string;
}

export namespace GenericSkillResults {
  export class SkillNotFound implements SkillResult {
    message: string;
    constructor(skillName: string) {
      this.message = `SkillInvocationError: '${skillName}' is not a recognized or supported skill function. Please check the spelling and try again.`;
    }
  }

  export class UnhandledRuntimeError implements SkillResult {
    message: string;
    constructor(skillName: string, error: Error) {
      const errorString = error.toString();
      this.message = `SkillRuntimeError: An unexpected/unhandled error occurred while attempting to execute '${skillName}': ${errorString}`;
    }
  }
}

export namespace PathfindToCoordinatesResults {
  export class InvalidThing implements SkillResult {
    message: string;
    constructor(thing: string, supportedThingTypes: string) {
      this.message = `SkillInvocationError: '${thing}' is not a recognized or supported thing. Currently, only these varieties of things can be stopped at if found: ${supportedThingTypes}.`;
    }
  }

  export class InvalidCoords implements SkillResult {
    message: string;
    constructor(coords: [number, number, number]) {
      const coordsString = `[${coords[0]}, ${coords[1]}, ${coords[2]}]`;
      this.message = `SkillInvocationError: '${coordsString}' is not a valid coordinates array. Expected an array of three numbers ordered as [x, y, z].`;
    }
  }

  export class FoundThingInImmediateSurroundings implements SkillResult {
    message: string;
    constructor(targetCoords: Vec3, foundThingName: string) {
      const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
      this.message = `Your pathfinding to or near ${targetCoordsString} was terminated early since '${foundThingName}' was found visible in the immediate surroundings.`;
    }
  }

  export class FoundThingInDistantSurroundings implements SkillResult {
    message: string;
    constructor(targetCoords: Vec3, foundThingName: string) {
      const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
      this.message = `Your pathfinding to or near ${targetCoordsString} was terminated early since '${foundThingName}' was found visible in the distant surroundings.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(reachedCoords: Vec3, targetCoords: Vec3) {
      const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
      const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
      this.message = `You were only able to pathfind to ${reachedCoordsString} and not ${targetCoordsString}.`;
      // TODO: Is it possible to add layman-understandable reasons to this?
      // E.g., "because these blocks were impeding the way: '{impedingBlockNames}'"...
      // ...allowing the LLM to reason that, if it really wanted to proceeed towards these
      // coords, it might want to acquire a tool that is better fit for breaking such blocks.
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(targetCoords: Vec3) {
      const targetCoordsString = `[${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}]`;
      this.message = `You were able to successfully pathfind to or near ${targetCoordsString} (such that these coordinates are now in your immediate surroundings).`;
    }
  }
}

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

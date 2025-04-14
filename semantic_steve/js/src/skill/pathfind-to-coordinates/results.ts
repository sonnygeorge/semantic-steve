import { Vec3 } from "vec3";
import { SkillResult } from "../../types";

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

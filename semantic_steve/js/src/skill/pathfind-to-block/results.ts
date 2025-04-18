import { Vec3 } from "vec3";
import { SkillResult } from "../../types";

export namespace PathfindToBlockResults {
  export class InvalidBlock implements SkillResult {
    message: string;
    constructor(blockName: string) {
      this.message = `SkillInvocationError: '${blockName}' is not a recognized or supported block type.`;
    }
  }

  export class BlockNotFound implements SkillResult {
    message: string;
    constructor(blockName: string) {
      this.message = `SkillInvocationError: Block '${blockName}' is not visible in your surroundings. Cannot pathfind to it.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(reachedCoords: Vec3, blockCoords: Vec3, blockName: string) {
      const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
      const blockCoordsString = `[${blockCoords.x}, ${blockCoords.y}, ${blockCoords.z}]`;
      this.message = `You were only able to pathfind to ${reachedCoordsString} and not to the ${blockName} at ${blockCoordsString}.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(blockCoords: Vec3, blockName: string) {
      const blockCoordsString = `[${blockCoords.x}, ${blockCoords.y}, ${blockCoords.z}]`;
      this.message = `You were able to successfully pathfind to the ${blockName} at ${blockCoordsString}.`;
    }
  }
}

import { Vec3 } from "vec3";
import { SkillResult } from "../../types";

export namespace PathfindToItemResults {
  export class InvalidItem implements SkillResult {
    message: string;
    constructor(itemName: string) {
      this.message = `SkillInvocationError: '${itemName}' is not a recognized or supported item entity.`;
    }
  }

  export class ItemNotFound implements SkillResult {
    message: string;
    constructor(itemName: string) {
      this.message = `SkillInvocationError: Item '${itemName}' is not visible in your surroundings. Cannot pathfind to it.`;
    }
  }

  export class PartialSuccess implements SkillResult {
    message: string;
    constructor(reachedCoords: Vec3, itemCoords: Vec3, itemName: string) {
      const reachedCoordsString = `[${reachedCoords.x}, ${reachedCoords.y}, ${reachedCoords.z}]`;
      const itemCoordsString = `[${itemCoords.x}, ${itemCoords.y}, ${itemCoords.z}]`;
      this.message = `You were only able to pathfind to ${reachedCoordsString} and not to the ${itemName} at ${itemCoordsString}.`;
    }
  }

  export class Success implements SkillResult {
    message: string;
    constructor(itemCoords: Vec3, itemName: string) {
      const itemCoordsString = `[${itemCoords.x}, ${itemCoords.y}, ${itemCoords.z}]`;
      this.message = `You were able to successfully pathfind to the ${itemName} at ${itemCoordsString}.`;
    }
  }
}
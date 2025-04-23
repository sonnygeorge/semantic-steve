import { SkillResult } from "../../types";
import { Vec3 } from "vec3";

export namespace GetPlaceableCoordinatesResults {
  export class Success implements SkillResult {
    message: string;
    constructor(placeableCoords: Vec3[]) {
      const placeableCoordsString = placeableCoords
        .map((vec): string => `[${vec.x}, ${vec.y}, ${vec.z}]`)
        .join(", ");
      this.message = `Currently, these are the coordinates at which a block can be placed: [${placeableCoordsString}]`;
    }
  }

  export class NoPlaceableCoords implements SkillResult {
    message: string;
    constructor() {
      this.message =
        "Currently, there are no coordinates at which a block can be placed. Perhaps the bot is in a 1x1 hole or some other tight space.";
    }
  }
}

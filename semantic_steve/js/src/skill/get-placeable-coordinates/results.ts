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
}

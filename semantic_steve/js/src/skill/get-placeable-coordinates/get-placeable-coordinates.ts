import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";

import { GetPlaceableCoordinatesResults } from "./results";
import { getAllPlaceableCoords } from "../../utils/placing";

export class GetPlaceableCoordinates extends Skill {
  public static readonly TIMEOUT_MS: number = 2000; // 2 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "getPlaceableCoordinates",
    signature: "getPlaceableCoordinates()",
    docstring: `
          /**
           * Gets the coordinates at which it is currently possible to place a block.
           */
        `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  public async invoke(): Promise<void> {
    const placeableCoords = getAllPlaceableCoords(this.bot);
    if (placeableCoords.length === 0) {
      const result = new GetPlaceableCoordinatesResults.NoPlaceableCoords();
      this.onResolution(result);
    } else {
      const result = new GetPlaceableCoordinatesResults.Success(
        placeableCoords,
      );
      this.onResolution(result);
    }
  }

  // These don't need to do anything since invoke never gives up the event loop
  public async pause(): Promise<void> {}
  public async resume(): Promise<void> {}
}

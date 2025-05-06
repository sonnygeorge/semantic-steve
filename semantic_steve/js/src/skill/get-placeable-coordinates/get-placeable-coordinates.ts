import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";

import { GetPlaceableCoordinatesResults } from "./results";
import { getAllPlaceableCoords } from "../../utils/placing";

export class GetPlaceableCoordinates extends Skill {
  public static readonly TIMEOUT_MS: number = 8000; // 8 seconds
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

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(): Promise<void> {
    const placeableCoords = getAllPlaceableCoords(this.bot);
    if (placeableCoords.length === 0) {
      const result = new GetPlaceableCoordinatesResults.NoPlaceableCoords();
      this.resolve(result);
    } else {
      const result = new GetPlaceableCoordinatesResults.Success(
        placeableCoords,
      );
      this.resolve(result);
    }
  }

  // These will never get called since this skill never gives up the event loop.
  // Nevertheless, we need to implement them to satisfy the Skill ABC.
  public async doPause(): Promise<void> {}
  public async doResume(): Promise<void> {}
  public async doStop(): Promise<void> {}
}

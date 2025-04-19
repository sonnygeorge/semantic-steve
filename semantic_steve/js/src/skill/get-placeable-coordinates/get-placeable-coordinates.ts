import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { Vec3 } from "vec3";
import { GetPlaceableCoordinatesResults } from "./results";
import { getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable } from "../../utils";
import { MAX_PLACEMENT_REACH } from "../../constants";
import { isBotOccupyingCoords } from "../../utils";

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
    const placeableCoords: Vec3[] = [];
    const botPosition = this.bot.entity.position.floored();
    const radius = MAX_PLACEMENT_REACH + 1;
    // Iterate through all blocks within the radius
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const coords = botPosition.offset(x, y, z);
          // Skip coordinates the bot is currently occupying
          if (isBotOccupyingCoords(this.bot, coords)) {
            continue;
          }
          // Check if the coordinates are placeable
          const refernceBlockAndFaceVector =
            getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(
              this.bot,
              coords
            );
          if (refernceBlockAndFaceVector !== undefined) {
            placeableCoords.push(coords);
          }
        }
      }
    }
    const result = new GetPlaceableCoordinatesResults.Success(placeableCoords);
    this.onResolution(result);
  }

  // These don't need to do anything since invoke never gives up the event loop
  public async pause(): Promise<void> {}
  public async resume(): Promise<void> {}
}

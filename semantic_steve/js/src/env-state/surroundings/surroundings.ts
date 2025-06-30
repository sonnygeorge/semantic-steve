import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "./common";
import { Block as PBlock } from "prismarine-block";
import { VisibilityRaycastManager } from "./visibility-raycast-manager";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";
import { getVicinityMasks } from "./get-vicinity-masks";
import { getVoxelOfPosition } from "../../utils/misc";
import { SurroundingsDTO } from "./dto";
import {
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
  VicinitiesManager,
} from "./vicinity";
import { classifyVicinityOfPosition } from "./get-vicinity-masks";

export class Surroundings {
  private bot: Bot;
  private vicinitiesManager: VicinitiesManager;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.vicinitiesManager = new VicinitiesManager(bot, radii);
    this.immediate = this.vicinitiesManager.immediate;
    this.distant = this.vicinitiesManager.distant;
    this.radii = this.vicinitiesManager.radii;
  }

  public beginObservation(): void {
    this.vicinitiesManager.beginObservation();
  }

  public *iterVicinities(): Generator<
    ImmediateSurroundings | DistantSurroundingsInADirection
  > {
    yield this.immediate;
    for (const direction of Object.values(DirectionName)) {
      yield this.distant.get(direction)!;
    }
  }

  public getVicinityForPosition(position: Vec3): VicinityName | undefined {
    return classifyVicinityOfPosition(
      position,
      this.bot.entity.position,
      this.radii.immediateSurroundingsRadius,
      this.radii.distantSurroundingsRadius
    );
  }

  getDTO(): SurroundingsDTO {
    return {
      immediateSurroundings: this.immediate.getDTO(),
      distantSurroundings: Object.fromEntries(
        [...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])
      ),
    };
  }
}

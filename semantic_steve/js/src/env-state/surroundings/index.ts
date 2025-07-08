import { SurroundingsRadii, DirectionName, VicinityName } from "./common";
import {
  ImmediateSurroundingsDTO,
  DistantSurroundingsInADirectionDTO,
} from "./dto";
import {
  VisibleVicinityContents,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
  VicinitiesManager,
  Vicinity,
} from "./vicinity";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

import { classifyVicinityOfPosition } from "./get-vicinity-masks";
import { VicinitiesObserver } from "./visibility-manager/vicinities-observer";

export {
  SurroundingsRadii,
  DirectionName,
  VicinityName,
  ImmediateSurroundingsDTO,
  DistantSurroundingsInADirectionDTO,
  VisibleVicinityContents,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
  VicinitiesManager,
  Vicinity,
};

export interface SurroundingsDTO {}

export class Surroundings {
  private bot: Bot;
  private vicinitiesObserver: VicinitiesObserver;
  private vicinitiesManager: VicinitiesManager;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.vicinitiesObserver = new VicinitiesObserver(bot, radii);
    this.vicinitiesManager = new VicinitiesManager(bot, radii);
    this.immediate = this.vicinitiesManager.immediate;
    this.distant = this.vicinitiesManager.distant;
    this.radii = this.vicinitiesManager.radii;
  }

  public beginObservation(): void {
    this.vicinitiesObserver.beginObservation();
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
    return {};
  }
}

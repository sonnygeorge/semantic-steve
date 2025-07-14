import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "../../types";
import { SurroundingsDTO } from "./dto";
import {
  VicinitiesObserver,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
} from "./vicinity";
import { classifyVicinityOfPosition } from "./classify-vicinity";

export class Surroundings {
  private bot: Bot;
  private vicinitiesObserver: VicinitiesObserver;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.vicinitiesObserver = new VicinitiesObserver(bot, radii);
    this.immediate = this.vicinitiesObserver.immediate;
    this.distant = this.vicinitiesObserver.distant;
    this.radii = this.vicinitiesObserver.radii;
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
      this.radii.distantSurroundingsRadius,
    );
  }

  getDTO(): SurroundingsDTO {
    console.log("Getting Surroundings DTO");
    return {
      immediateSurroundings: this.immediate.getDTO(),
      distantSurroundings: Object.fromEntries(
        [...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()]),
      ),
    };
  }
}

import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "../../types";
import { DistantSurroundingsInADirectionDTO, SurroundingsDTO } from "./dto";
import {
  VicinitiesObserver,
  ImmediateSurroundings,
  DistantSurroundingsInADirection,
} from "./vicinity";
import { classifyVicinityOfPosition } from "./classify-vicinity";

export class Surroundings {
  private bot: Bot;
  public vicinitiesObserver: VicinitiesObserver;
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

  public async beginObservation(): Promise<void> {
    await this.vicinitiesObserver.beginObservation();
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

  async getDTO(): Promise<SurroundingsDTO> {
    const distantDTOs: Map<DirectionName, DistantSurroundingsInADirectionDTO> =
      new Map();
    for (const direction of Object.values(DirectionName)) {
      distantDTOs.set(direction, await this.distant.get(direction)!.getDTO());
    }

    return {
      immediateSurroundings: await this.immediate.getDTO(),
      distantSurroundings: Object.fromEntries(distantDTOs.entries()),
    };
  }
}

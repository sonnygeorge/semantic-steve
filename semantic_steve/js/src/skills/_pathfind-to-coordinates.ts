import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";
import { PartiallyComputedPath, goals } from "mineflayer-pathfinder";
import { Thing } from "../core/thing/protocol";
import { SkillReturn } from "../types";
import { pathfindToCoordinatesResultsMessages } from "../results-messages";

type PathfindToCoordinatesEvents = {
  thingFound: (thingName: string) => void;
  threatDetected: () => void;
  // TODO: Hunger?
};

export class Pathfinder extends (EventEmitter as new () => TypedEmitter<PathfindToCoordinatesEvents>) {
  bot: Bot;

  public constructor(bot: Bot) {
    super();
    this.bot = bot;
  }

  public async pathfindToCoordinates(
    coords: Vec3,
    stopIfFound: Thing[]
  ): Promise<SkillReturn> {
    let goal: goals.GoalBlock = new goals.GoalBlock(
      coords.x,
      coords.y,
      coords.z
    );
    this.bot.pathfinder.setGoal(goal);

    const checkEnvironment = (lastMove: Vec3): void => {
      // Hydrate the envState
      const throttleSeconds = 2;
      this.bot.envState.hydrate(throttleSeconds);
      // Check for stopIfFound things
      for (const thing of stopIfFound) {
        if (thing.isVisibleInSurroundings()) {
          this.emit("thingFound", thing.name);
        }
      }
    };

    const checkForNoPathOrTimeout = (path: PartiallyComputedPath): void => {
      if (path.status === "noPath" || path.status === "timeout") {
        cleanup();
      }
    };

    const pauseAndHandleThreat = (): void => {
      if (goal === this.bot.pathfinder.goal) {
        this.bot.pathfinder.stop();
      }
      // TODO: Call the threat-handling function
      // Reinitiate pathfinding after threats are handled
      goal = new goals.GoalBlock(coords.x, coords.y, coords.z);
      this.bot.pathfinder.setGoal(goal);
    };

    const cleanup = (): void => {
      this.bot.off("goal_reached", cleanup);
      this.bot.off("path_stop", cleanup);
      this.bot.off("move", checkEnvironment);
      this.bot.off("path_update", checkForNoPathOrTimeout);
      if (goal === this.bot.pathfinder.goal) {
        this.bot.pathfinder.stop();
      }
    };

    const setup = (): void => {
      this.bot.on("move", checkEnvironment);
      this.bot.on("goal_reached", cleanup);
      this.bot.on("path_stop", cleanup);
      this.bot.on("path_update", checkForNoPathOrTimeout);
      this.on("threatDetected", pauseAndHandleThreat);
    };

    // Await exit condition
    return await new Promise<SkillReturn>((resolve) => {
      this.on("thingFound", (thingName) => {
        resolve({
          resultString: pathfindToCoordinatesResultsMessages.FOUND_THING(
            `[${coords.x}, ${coords.y}, ${coords.z}]`,
            thingName
          ),
          envStateIsHydrated: true,
        });
      });
      this.bot.on("goal_reached", () => {
        resolve({
          resultString: pathfindToCoordinatesResultsMessages.SUCCESS(
            `[${coords.x}, ${coords.y}, ${coords.z}]`
          ),
          envStateIsHydrated: false,
        });
      });
      this.bot.on("path_update", (path) => {
        if (path.status === "noPath") {
          resolve({
            resultString: pathfindToCoordinatesResultsMessages.PARTIAL_SUCCESS(
              `[${coords.x}, ${coords.y}, ${coords.z}]`,
              `[${this.bot.entity.position.x}, ${this.bot.entity.position.y}, ${this.bot.entity.position.z}]`
            ),
            envStateIsHydrated: false,
          });
        }
      });
      this.bot.on("path_stop", () => {
        resolve({
          resultString: pathfindToCoordinatesResultsMessages.PARTIAL_SUCCESS(
            `[${coords.x}, ${coords.y}, ${coords.z}]`,
            `[${this.bot.entity.position.x}, ${this.bot.entity.position.y}, ${this.bot.entity.position.z}]`
          ),
          envStateIsHydrated: false,
        });
      });
    });
  }
}

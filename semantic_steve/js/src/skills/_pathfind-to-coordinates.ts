import type { Bot } from "mineflayer";
import { SkillReturn } from "../types";
import { Vec3 } from "vec3";
import { Thing } from "../core/thing/protocol";

export async function _pathfindToCoordinates(
  bot: Bot,
  coords: Vec3,
  stopIfFound: Thing[],
): Promise<SkillReturn> {
  return {
    // TODO
    resultString: null,
    envStateIsHydrated: false,
  };
}

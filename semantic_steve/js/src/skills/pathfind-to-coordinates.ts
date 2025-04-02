import type { Bot } from "mineflayer";
import { SkillReturn } from "../types";


export async function pathfindToCoordinates(bot: Bot, coords: number[], stopIfFound: string[]): Promise<SkillReturn>  {
    return {
        resultString: null,
        envStateIsUpToDate: false,
    }
}
import type { Bot } from "mineflayer";
import { SkillReturnObj } from "../types";


export async function pathfindToCoordinates(bot: Bot, coords: number[], stopIfFound: string[]): Promise<SkillReturnObj>  {
    return {
        resultString: null,
        envStateIsUpToDate: false,
    }
}
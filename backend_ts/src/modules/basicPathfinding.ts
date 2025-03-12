import { Bot } from "mineflayer";
import {Vec3} from 'vec3'

import { pathfindToCoordinates as og } from "../pathfind";
import { SemanticSteveFunctionReturnObj } from "../types";
import { goals } from "mineflayer-pathfinder";

export default async function pathfindToCoordinates(bot: Bot, coords: number[], stopIfFound: string[]): Promise<SemanticSteveFunctionReturnObj>  {
    const vec = new Vec3(coords[0], coords[1], coords[2])
    const goal =new  goals.GoalBlock(vec.x, vec.y, vec.z)
    
    return await og(bot, goal, stopIfFound);
}
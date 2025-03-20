import { Bot } from "mineflayer";
import { SemanticSteveFunctionReturnObj } from "../types";
import { buildFunctionRegistry } from ".";

export default async function help(bot: Bot):  Promise<SemanticSteveFunctionReturnObj> {
    // lazy way for now.
    const registry = buildFunctionRegistry();
    return {
        resultString: Object.keys(registry).join(', '),
        envStateIsUpToDate: false
    }
}
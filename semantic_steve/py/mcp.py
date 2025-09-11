from typing import Optional
import logging
from fastmcp import FastMCP, Context
from fastmcp.server.middleware import Middleware, MiddlewareContext, CallNext

from semantic_steve.py.js_messages import SkillInvocation
from semantic_steve.py.semantic_steve import SemanticSteve
from semantic_steve.py.constants import MCP_PORT


mcp = FastMCP("SemanticSteve")


class SemanticSteveMiddleware(Middleware):
    async def on_call_tool(self, context: MiddlewareContext, call_next: CallNext):
        if not context.fastmcp_context.get_state("semantic_steve"):
            semantic_steve = SemanticSteve()
            semantic_steve.__enter__()  # TODO: Need to add "spawn" tool to allow LLM to spawn and get initial env state...
            context.fastmcp_context.set_state("semantic_steve", semantic_steve)
        return await call_next(context)


mcp.add_middleware(SemanticSteveMiddleware())


@mcp.tool()
async def pathfind_to_coordinates(
    ctx: Context,
    coordinates: list[int],
    stop_if_found: Optional[list[str]] = None,
) -> dict:
    """
    Attempts to pathfind to or near a set of in-dimension coordinates (digging and
    bridging as needed), stopping early if something from the stop_if_found list
    becomes visible in the bot's surroundings.

    Args:
        coordinates: The target coordinates as a list ordered [x, y, z].
        stop_if_found: An optional array of strings representing things that, if
            found, should cause the pathfinding to stop (e.g., useful things).

    Returns:
        Dict containing environment state, skill results, and inventory changes.
    """
    semantic_steve: SemanticSteve = ctx.get_state("semantic_steve")
    args = [coordinates]
    if stop_if_found is not None:
        args.append(stop_if_found)

    skill_invocation = SkillInvocation(skillName="pathfindToCoordinates", args=args)
    result = await semantic_steve.invoke(skill_invocation)
    return result.model_dump()

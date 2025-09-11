"""
Minimal code examples for using SemanticSteve.

This file demonstrates different ways to interact with SemanticSteve:
1. Direct Python API usage (llm_example)
2. CLI mode (cli_example)
3. MCP (Model Context Protocol) client examples:
   - STDIO transport (mcp_client_example) - recommended for local desktop apps
   - HTTP transport (mcp_http_client_example) - for remote/web integrations

## MCP Transport Types Explained:

### STDIO Transport (Used by Claude Desktop)
- Communication via standard input/output streams
- Server runs as a subprocess of the client
- Benefits: No network setup, lower latency, more secure
- Use cases: Desktop applications, local CLI tools, development

### HTTP Transport
- Communication via HTTP requests over a network
- Server runs independently on a specific port
- Benefits: Remote access, web integration, multiple clients
- Use cases: Web applications, remote access, production deployments

Claude Desktop specifically uses STDIO transport because it provides a secure,
efficient way to communicate with MCP servers without network exposure.
"""

import asyncio
import os

from semantic_steve import SemanticSteve, run_as_cli


async def llm_example():
    # NOTE: You will need to set a valid OPENAI_API_KEY environment variable
    import openai

    sys_prompt = (
        f"You are a helpful assistant who {SemanticSteve.get_user_role_as_verb_phrase()}."
        "\nIMPORTANT: Pay close attention to the user messages which will tell you what's "
        "going on in the world.\nIMPORTANT: Make sure you are working in order, putting "
        "first things first, and considering your current inventory as well as the "
        "recent skillInvocationResults messages.\n"
        "Goal: Acquire iron. Think step by step:\n"
        "Thought: What do I observe? What does the state of the world/player tell me "
        "about my progress toward the goal?\n"
        "Action: [function_call]\n"
        "Only output your reasoning and ONE raw function call (with no backticks, "
        "fences, or other leading/trailing punctuation).\n\nAvailable functions:\n"
        "\n\n".join(SemanticSteve.get_skills_docs())
        + "\n\n"
    )

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    msgs = [{"role": "system", "content": sys_prompt}]

    with SemanticSteve() as ss:
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        while True:  # NOTE: Runs indefinitely until manually stopped
            readable_minecraft_env_data = data_from_minecraft.get_readable_string()
            print(readable_minecraft_env_data)
            msgs = msgs[0:1] + msgs[1:][-8:]  # Keep last 4 exchanges
            msgs.append({"role": "user", "content": readable_minecraft_env_data})
            response = client.chat.completions.create(
                model="gpt-4.1-2025-04-14", messages=msgs
            )
            full_response = response.choices[0].message.content
            # Basic hacky parsing to extract the function call
            # (we recommend using constrained generation reliably get skill invocations)
            fn_call_str = full_response.split("Action: ")[-1].strip().replace("`", "")
            msgs.append({"role": "assistant", "content": full_response})
            data_from_minecraft = await ss.invoke(fn_call_str)


async def cli_example():
    semantic_steve = SemanticSteve(_should_rebuild_typescript=True)
    await run_as_cli(semantic_steve)


async def mcp_client_example():
    from fastmcp import Client

    from semantic_steve.py.constants import MCP_PORT

    client = Client(f"http://localhost:{MCP_PORT}/mcp")
    async with client:
        result = await client.call_tool(
            "pathfind_to_coordinates", {"coordinates": [100, 65, 23]}
        )
        print(result)


if __name__ == "__main__":
    # Uncomment the example you want to run
    # asyncio.run(llm_example())
    # asyncio.run(cli_example())
    asyncio.run(mcp_client_example())

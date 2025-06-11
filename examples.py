"""Minimal code examples for using Semantic Steve."""

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
        "Goal: Smelt something. Think step by step:\n"
        "Thought: What do I observe? What does the state of the world/player tell me "
        "about my progress toward the goal?\n"
        "Action: [function_call]\n"
        "Only output your reasoning and ONE raw function call (with no backticks, "
        "fences, or other leading/trailing punctuation).\n\nAvailable functions:\n"
        "\n\n".join(SemanticSteve.get_skills_docs()) + "\n\n"
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
            response = client.chat.completions.create(model="gpt-4.1-2025-04-14", messages=msgs)
            full_response = response.choices[0].message.content
            # Basic hacky parsing to extract the function call
            # (we recommend using constrained generation reliably get skill invocations)
            fn_call_str = full_response.split("Action: ")[-1].strip().replace("`", "")
            msgs.append({"role": "assistant", "content": full_response})
            data_from_minecraft = await ss.invoke(fn_call_str)


async def cli_example():
    semantic_steve = SemanticSteve(_should_rebuild_typescript=True)
    await run_as_cli(semantic_steve)


if __name__ == "__main__":
    # Uncomment the example you want to run
    # asyncio.run(llm_example())
    asyncio.run(cli_example())

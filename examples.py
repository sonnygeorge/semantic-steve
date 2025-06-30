import asyncio
import os

from semantic_steve import SemanticSteve, run_as_cli


async def llm_example():
    import openai

    sys_prompt = (  # TODO: Include "tips" once implemented?
        f"You are a helpful assistant who {SemanticSteve.get_user_role_as_verb_phrase()}. "
        "Your goal  is to beat the Ender Dragon. You will work towards this goal "
        "message-by-message: reading over the up-to-date state of the world, considering "
        "your  progress/trajectory, and outputting NOTHING BUT a one-liner "
        'Javascript-valid function call to one of the following high-level "skill" '
        "functions. DO NOT OUTPUT ANYTHING ELSE BUT ONE LINE OF CODE (NO MARKDOWN FENCES!)\n"
        "\n\n".join(SemanticSteve.get_skills_docs())
    )

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    msgs = [{"role": "system", "content": sys_prompt}]

    with SemanticSteve() as ss:
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        while True:
            readable_minecraft_env_data = data_from_minecraft.get_readable_string()
            print(readable_minecraft_env_data)
            msgs.append({"role": "user", "content": readable_minecraft_env_data})
            response = client.chat.completions.create(model="gpt-4o-mini", messages=msgs)
            skill_invocation_str = response.choices[0].message.content
            print(skill_invocation_str)
            msgs.append({"role": "assistant", "content": skill_invocation_str})
            data_from_minecraft = await ss.invoke(skill_invocation_str)


async def cli_example():
    semantic_steve = SemanticSteve(_should_rebuild_typescript=True, _should_run_js_process=True)
    await run_as_cli(semantic_steve)


if __name__ == "__main__":
    # Uncomment the example you want to run
    # asyncio.run(llm_example())
    asyncio.run(cli_example())

import asyncio
from semantic_steve import run_as_cli, SemanticSteve


async def llm_example():
    import os
    import openai

    ss_docs = SemanticSteve.get_docs()
    sys_prompt = (
        f"You are a helpful assistant who {ss_docs.user_role_as_verb_phrase}. Your goal "
        "is to beat the Ender Dragon. You work towards this goal message-by-message, "
        "reading over the up-to-date state of the world, considering your "
        "progress/trajectory, and then outputting NOTHING BUT a single line of Python "
        'that is a syntactically valid function call to one of these high-level "skill" '
        f"functions:\n{ss_docs.skills_docs}",
    )

    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    msgs = [{"role": "system", "content": sys_prompt}]

    with SemanticSteve() as ss:
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        while True:
            msgs.append({"role": "user", "content": data_from_minecraft.get_pretty_string()})
            response = client.chat.completions.create(model="gpt-4o-mini", messages=msgs)
            skill_invocation_str = response.choices[0].message.content
            msgs.append({"role": "assistant", "content": skill_invocation_str})
            data_from_minecraft = ss.invoke(skill_invocation_str)


async def cli_example():
    semantic_steve = SemanticSteve(should_rebuild_typescript=True)
    await run_as_cli(semantic_steve)


if __name__ == "__main__":
    # Uncomment the example you want to run
    # asyncio.run(llm_example())
    asyncio.run(cli_example())

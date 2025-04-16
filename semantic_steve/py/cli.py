import os

from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory

from semantic_steve.py.constants import SEMANTIC_STEVE_ASCII_ART
from semantic_steve.py.semantic_steve import SemanticSteve


async def run_as_cli(semantic_steve: SemanticSteve):
    history_dir = os.path.expanduser("~/.semantic_steve")
    os.makedirs(history_dir, exist_ok=True)
    history_file = os.path.join(history_dir, "history.txt")
    history = FileHistory(history_file)
    session = PromptSession(
        "Invoke a skill (or 'exit' to quit or 'skills' to see skills docs): ",
        history=history,
        enable_history_search=True,  # Allows search through command history with up/down
        multiline=False,
    )
    with semantic_steve as ss:
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        print(SEMANTIC_STEVE_ASCII_ART)
        print(data_from_minecraft.get_readable_string())
        while True:
            skill_invocation_str: str = await session.prompt_async()
            skill_invocation_str = skill_invocation_str.strip()
            if skill_invocation_str.lower() == "exit":
                break
            elif skill_invocation_str.lower() == "skills":
                print(SEMANTIC_STEVE_ASCII_ART)
                print()
                print("\n\n".join(ss.get_skills_docs()))
                print()
            else:
                try:
                    data_from_minecraft = await ss.invoke(skill_invocation_str)
                    print(SEMANTIC_STEVE_ASCII_ART)
                    print(data_from_minecraft.get_readable_string())
                except Exception as e:
                    print(f"Error invoking skill: {e}")

from semantic_steve.py.constants import SEMANTIC_STEVE_ASCII_ART
from semantic_steve.py.semantic_steve import SemanticSteve


# TODO: Add 'skills' and 'tips' commands... 'help' command?
async def run_as_cli(semantic_steve: SemanticSteve):
    with semantic_steve as ss:  # Start up JS process & connect to ZMQ socket
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        while True:
            print(SEMANTIC_STEVE_ASCII_ART)
            print(data_from_minecraft.get_readable_string())
            skill_invocation_str = input("Invoke a skill (or 'exit' to quit): ").strip()
            if skill_invocation_str.lower() == "exit":
                break
            data_from_minecraft = await ss.invoke(skill_invocation_str)

import re

from semantic_steve.py.constants import PATH_TO_SKILLS_REGISTRY


def strip_whitespace_from_lines(text: str) -> str:
    lines = text.splitlines()
    stripped_lines = [line.lstrip() for line in lines]
    return "\n".join(stripped_lines)


def generate_skills_docs() -> list[str]:
    with open(PATH_TO_SKILLS_REGISTRY, "r") as file:
        skill_registry_ts_file_raw = file.read()

    # Extract the content of the registry-building function
    build_registry_fn_name = "buildSkillsRegistry"
    fn_content_pattern = r"{fn_name}\s*\([^)]*\)\s*:[^{{]*{{(.*?)}}"
    build_registry_fn_content_pattern = fn_content_pattern.format(
        fn_name=build_registry_fn_name
    )
    build_registry_fn_content_match = re.search(
        build_registry_fn_content_pattern, skill_registry_ts_file_raw, re.DOTALL
    )
    if not build_registry_fn_content_match:
        msg = f"Can't find the '{build_registry_fn_name}' function in the file."
        raise ValueError(msg)
    build_registry_fn_content = build_registry_fn_content_match.group(1)

    # Find all skills with docstrings
    anything = r"[\s\S]*?"
    any_whitespace = r"\s*"
    docstring_capture = rf"(\/\*\*{anything}\*\/)"
    name_capture = r"(\w+)"
    optional_async_kw = r"(?:async)?"
    params_capture = r"\(([^)]*)\)"
    skill_pattern = (
        f"{docstring_capture}{any_whitespace}{name_capture}{any_whitespace}:"
        f"{any_whitespace}{optional_async_kw}{any_whitespace}{params_capture}"
    )
    skills_matches = re.finditer(
        skill_pattern, build_registry_fn_content, re.MULTILINE | re.DOTALL
    )

    skills_docs = []
    for match in skills_matches:
        # Extract elements from the match
        docstring = match.group(1)
        if "TODO" in docstring:
            continue  # Skip if docstring contains "TODO"
        skill_name = match.group(2)
        params = match.group(3)

        # Put it all together and append to list
        formatted_docstring = strip_whitespace_from_lines(docstring)
        function_signature = f"{skill_name}: ({params}) => {{...}}"
        skills_docs.append(f"{formatted_docstring}\n{function_signature}")

    return skills_docs

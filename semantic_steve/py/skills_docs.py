"""Code to read and parse TypeScript files in the skills directory to extract docstrings and signatures."""

import os

from semantic_steve.py.constants import PATH_TO_SKILLS_DIR


class SkillMetadataExtractionError(Exception):
    pass


def extract_docstring_and_signature_from_ts_file(
    ts_file: str,
) -> tuple[str, str]:
    """
    Extracts metadata from a TypeScript file string.

    Args:
        ts_file (str): The raw string content of a .ts file

    Returns:
        tuple[str, str]: A tuple containing the docstring and signature.
    """

    def extract_field(content: str, field_name: str) -> str | None:
        field_start = content.find(field_name)
        if field_start == -1:
            raise SkillMetadataExtractionError(
                f"Field '{field_name}' not found in metadata."
            )
        # Move past the field name and any whitespace or colon
        pos = field_start + len(field_name)
        # Skip any whitespace after the field name
        while pos < len(content) and content[pos].isspace():
            pos += 1
        if pos >= len(content):  # Check for string delimiters
            raise SkillMetadataExtractionError(
                f"Field '{field_name}' has no value in metadata."
            )
        # Determine the string delimiter (single quote, double quote, or backtick)
        if content[pos] == '"':
            delimiter = '"'
        elif content[pos] == "'":
            delimiter = "'"
        elif content[pos] == "`":
            delimiter = "`"
        else:
            raise SkillMetadataExtractionError(
                f"Field '{field_name}' has an unexpected string delimiter."
            )
        # Find the closing delimiter, accounting for multi-line strings
        start_pos = pos + 1  # Skip the opening delimiter
        pos = start_pos
        # Handle potential escaped delimiters
        while pos < len(content):
            next_delimiter = content.find(delimiter, pos)
            if next_delimiter == -1:
                raise SkillMetadataExtractionError(
                    f"Couldn't find closing delimiter for Field '{field_name}'."
                )
            # Check if this delimiter is escaped
            if next_delimiter > 0 and content[next_delimiter - 1] == "\\":
                pos = next_delimiter + 1
                continue
            end_pos = next_delimiter
            break
        if pos >= len(content):
            raise SkillMetadataExtractionError(
                f"Couldn't find closing delimiter for Field '{field_name}'."
            )
        return content[start_pos:end_pos]

    metadata_index = ts_file.find("METADATA: SkillMetadata")
    if metadata_index == -1:
        raise SkillMetadataExtractionError("No metadata found in TypeScript file.")
    start_pos = ts_file.find("{", metadata_index)
    if start_pos == -1:
        raise SkillMetadataExtractionError("No metadata found in TypeScript file.")
    end_pos = ts_file.find("}", start_pos)
    if end_pos == -1:
        raise SkillMetadataExtractionError("No metadata found in TypeScript file.")
    metadata_content = ts_file[start_pos + 1 : end_pos].strip()

    return extract_field(metadata_content, "docstring:"), extract_field(
        metadata_content, "signature:"
    )


def strip_whitespace_from_lines(text: str) -> str:
    lines = text.splitlines()
    stripped_lines = [line.lstrip() for line in lines]
    return "\n".join(stripped_lines).strip()


def generate_skills_docs() -> list[str]:
    """
    Generates a list of docstrings and signatures from TypeScript files in the skills
    directory.

    Returns:
        list[str]: A list of formatted docstrings and signatures.
    """
    skills_docs = []
    for fname in os.listdir(PATH_TO_SKILLS_DIR):
        if not os.path.isdir(os.path.join(PATH_TO_SKILLS_DIR, fname)):
            continue

        skill_ts_fpath = os.path.join(PATH_TO_SKILLS_DIR, fname, f"{fname}.ts")
        if not os.path.isfile(skill_ts_fpath):
            continue

        with open(skill_ts_fpath) as file:
            skill_ts_file_raw = file.read()
        try:
            docstring, signature = extract_docstring_and_signature_from_ts_file(
                skill_ts_file_raw
            )
        except SkillMetadataExtractionError:
            # Skip files that don't have the expected metadata format
            print(f"WARNING: No skill docs in {skill_ts_fpath}.")
            continue
        if docstring is None or signature is None:
            print(
                "WARNING: TODO comment triggered skipping retrieval of skilll docs "
                f"from {skill_ts_fpath}."
            )
            continue
        # Skip if docstring contains "TODO"
        if "TODO" in docstring:
            continue
        # Format the docstring
        formatted_docstring = strip_whitespace_from_lines(docstring)
        skills_docs.append(f"{formatted_docstring}\n{signature}")
    return skills_docs

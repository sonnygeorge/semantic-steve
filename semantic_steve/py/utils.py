import ast
import os
import json

import subprocess
import sys

from semantic_steve.py.constants import PATH_TO_JS_DIR


class SingleLineListEncoder(json.JSONEncoder):
    """Custom JSON encoder that formats lists on a single line"""

    def encode(self, obj):
        # Start with standard encoding
        result = super().encode(obj)
        # Custom formatting for lists
        if isinstance(obj, list):
            # Keep lists on a single line by removing newlines and spaces after commas
            return "[" + ", ".join(json.dumps(item) for item in obj) + "]"
        # For objects/dicts, recurse into their items
        elif isinstance(obj, dict):
            indented = json.dumps(obj, indent=4)
            # Clean up any lists
            parts = []
            i = 0
            while i < len(indented):
                if indented[i : i + 2] == "[\n":
                    opening_bracket = i
                    # Iterate until we find the matching closing bracket
                    depth = 1
                    j = i + 1
                    while depth > 0 and j < len(indented):
                        if indented[j] == "[":
                            depth += 1
                        elif indented[j] == "]":
                            depth -= 1
                        j += 1
                    if depth == 0:
                        closing_bracket = j
                        list_content = indented[opening_bracket:closing_bracket]
                        list_obj = json.loads(list_content)
                        parts.append(
                            "[" + ", ".join(json.dumps(item) for item in list_obj) + "]"
                        )
                        i = j
                        continue
                parts.append(indented[i])
                i += 1
            return "".join(parts)
        return result


def parse_skill_invocation(function_call_str: str) -> tuple[str, list, dict]:
    """Parses a skill invocation string into its components."""

    function_call_str = function_call_str.strip()
    if "(" not in function_call_str or ")" not in function_call_str:
        return function_call_str, [], {}
    name_part, args_part = function_call_str.split("(", 1)
    args_part = args_part.rsplit(")", 1)[0]
    function_name = name_part.strip()
    if not function_name:
        return "", [], {}
    if not args_part.strip():
        return function_name, [], {}
    args = []
    kwargs = {}
    current_arg = ""
    paren_count = 0
    bracket_count = 0
    in_quotes = False
    for char in args_part:
        if char == "'" and not in_quotes:
            in_quotes = True
        elif char == "'" and in_quotes:
            in_quotes = False
        elif char == "(" and not in_quotes:
            paren_count += 1
        elif char == ")" and not in_quotes:
            paren_count -= 1
        elif char == "[" and not in_quotes:
            bracket_count += 1
        elif char == "]" and not in_quotes:
            bracket_count -= 1
        elif char == "," and not in_quotes and paren_count == 0 and bracket_count == 0:
            if current_arg.strip():
                if "=" in current_arg:
                    key, value = current_arg.split("=", 1)
                    try:
                        parsed_value = ast.literal_eval(value.strip())
                    except (ValueError, SyntaxError):
                        parsed_value = value.strip()
                    kwargs[key.strip()] = parsed_value
                else:
                    try:
                        parsed_arg = ast.literal_eval(current_arg.strip())
                    except (ValueError, SyntaxError):
                        parsed_arg = current_arg.strip()
                    args.append(parsed_arg)
            current_arg = ""
            continue
        current_arg += char
    if current_arg.strip():
        if "=" in current_arg:
            key, value = current_arg.split("=", 1)
            try:
                parsed_value = ast.literal_eval(value.strip())
            except (ValueError, SyntaxError):
                parsed_value = value.strip()
            kwargs[key.strip()] = parsed_value
        else:
            try:
                parsed_arg = ast.literal_eval(current_arg.strip())
            except (ValueError, SyntaxError):
                parsed_arg = current_arg.strip()
            args.append(parsed_arg)
    return function_name, args, kwargs


def ascertain_js_dependencies():
    if not os.path.exists(PATH_TO_JS_DIR):
        raise RuntimeError(
            "Somehow the necessary javascript code directory does not exist at the "
            f"expected location: '{PATH_TO_JS_DIR}'. Try reinstalling the package and "
            "report this issue if it persists."
        )

    # Validate Node.js version
    invalid_node_version_recommendation = (
        "Please install Node.js 22 from https://nodejs.org or use a version manager"
        " like nvm: `nvm install 22`. The command `node --version` must return a "
        "version starting with 'v22'. in order for SemanticSteve to run."
    )
    try:
        result = subprocess.run(
            ["node", "--version"], capture_output=True, text=True, check=True
        )
        version = result.stdout.strip().lstrip("v")  # e.g., "22.1.0"
        major = int(version.split(".")[0])
        if major != 22:
            raise RuntimeError(
                f"Node.js version {version} found, but version 22 is required. "
                + invalid_node_version_recommendation
            )
    except FileNotFoundError:
        raise RuntimeError(
            "Node.js is not installed or not found in PATH. "
            + "Please install Node.js 22 from https://nodejs.org or use a version manager"
            " like nvm: `nvm install 22`. The command `node --version` must return a "
            "version starting with 'v22'. in order to run SemanticSteve."
        )
    except subprocess.CalledProcessError:
        raise RuntimeError(
            "Failed to run `node --version`. " + invalid_node_version_recommendation
        )
    except ValueError:
        raise RuntimeError(
            "Could not parse Node.js version. " + invalid_node_version_recommendation
        )

    # Ensure JS dependencies are installed
    try:
        subprocess.run(
            ["yarn", "install"],
            cwd=PATH_TO_JS_DIR,
            check=True,
            stdout=sys.stdout,
            stderr=sys.stderr,
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"The following error occurred while trying to run `yarn "
            f"install` to ascertain the JS dependencies: {e}"
        )
    except FileNotFoundError:
        raise RuntimeError(
            "yarn is not installed or not found in PATH. "
            "Please install yarn using npm: `npm install -g yarn`"
        )

import ast


def parse_python_syntax_skill_invocation(function_call_str: str) -> tuple[str, list, dict]:
    function_call_str = function_call_str.strip()
    if "(" not in function_call_str or ")" not in function_call_str:
        raise ValueError("Invalid function call string: missing parentheses")
    name_part, args_part = function_call_str.split("(", 1)
    args_part = args_part.rsplit(")", 1)[0]
    function_name = name_part.strip()
    if not function_name:
        raise ValueError("Invalid function call string: missing function name")
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

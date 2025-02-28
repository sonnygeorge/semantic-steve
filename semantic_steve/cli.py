import ast
import os
import json
import re
import time
import subprocess
import sys
import traceback
from typing import Optional

import zmq


# TODO: Split things up into seperate files

FRONTEND_CONSOLE_ESC_SEQUENCE = "\033[35m"
BACKEND_CONSOLE_ESC_SEQUENCE = "\033[0m"


# Overwrite the built-in `print` function so all output is not colored (but colors anything that follows)

_print = print


def print(*args):  # Overwrite the built-in `print` function so all output is colored
    colored_args = []
    for arg in args:
        colored_args.append(
            f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{arg}{BACKEND_CONSOLE_ESC_SEQUENCE}"
        )
    _print(*colored_args)


# Override the default excepthook console output is not colored (but colors anything that follows)


def custom_excepthook(exc_type, exc_value, exc_traceback):
    _print(
        f"{FRONTEND_CONSOLE_ESC_SEQUENCE}Traceback (most recent call last):{BACKEND_CONSOLE_ESC_SEQUENCE}"
    )
    tb_lines = traceback.format_tb(exc_traceback)
    for line in tb_lines:
        _print(f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{line}{BACKEND_CONSOLE_ESC_SEQUENCE}")
    _print(
        f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{exc_type.__name__}: {exc_value}{BACKEND_CONSOLE_ESC_SEQUENCE}"
    )


sys.excepthook = custom_excepthook


# Overwrite the built-in `input` function so it's not colored (but colors anything that follows)
_input = input


def input(
    prompt: Optional[str] = None,
):  # Overwrite the built-in `input` function so it's not colored
    if prompt is not None:
        _print(
            f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{prompt}{BACKEND_CONSOLE_ESC_SEQUENCE}",
            end="",
        )
    return _input()


# Since the above above functions make any console output between Python outputs colored,
# the old (regular) print function is now a colored print function!
print_backend_console_output = _print


def parse_function_call_str(function_call_str: str) -> tuple[str, list, dict[str, any]]:
    # Remove leading/trailing whitespace
    function_call_str = function_call_str.strip()

    # Split into function name and arguments part
    if "(" not in function_call_str or ")" not in function_call_str:
        raise ValueError("Invalid function call string: missing parentheses")

    name_part, args_part = function_call_str.split("(", 1)
    args_part = args_part.rsplit(")", 1)[0]

    function_name = name_part.strip()
    if not function_name:
        raise ValueError("Invalid function call string: missing function name")

    # If no arguments, return empty lists/dicts
    if not args_part.strip():
        return function_name, [], {}

    args = []
    kwargs = {}

    # Split arguments while handling nested structures
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
                    # Convert value to appropriate type
                    try:
                        parsed_value = ast.literal_eval(value.strip())
                    except (ValueError, SyntaxError):
                        parsed_value = value.strip()  # Keep as string if can't parse
                    kwargs[key.strip()] = parsed_value
                else:
                    # Convert positional arg to appropriate type
                    try:
                        parsed_arg = ast.literal_eval(current_arg.strip())
                    except (ValueError, SyntaxError):
                        parsed_arg = (
                            current_arg.strip()
                        )  # Keep as string if can't parse
                    args.append(parsed_arg)
            current_arg = ""
            continue
        current_arg += char

    # Handle the last argument
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


SEMANTIC_STEVE_ASCII_ART = r"""  ____                             _   _        ____  _                 
 / ___|  ___ _ __ ___   __ _ _ __ | |_(_) ___  / ___|| |_ _____   _____ 
 \___ \ / _ \ '_ ` _ \ / _` | '_ \| __| |/ __| \___ \| __/ _ \ \ / / _ \
  ___) |  __/ | | | | | (_| | | | | |_| | (__   ___) | ||  __/\ V /  __/
 |____/ \___|_| |_| |_|\__,_|_| |_|\__|_|\___| |____/ \__\___| \_/ \___|"""


# TODO: Separate run_textworld_cli into appropriately atomic functions
def run_textworld_cli(rebuild_backend: bool = False):

    def check_backend_process():
        return_code = backend_process.poll()
        if return_code is not None:
            _, stderr = backend_process.communicate()
            if return_code != 0:
                print_backend_console_output(stderr)
                raise subprocess.CalledProcessError(
                    returncode=return_code,
                    cmd=backend_process_command,
                    stderr=stderr,
                )

    def cleanup_backend_process_if_needed():
        if backend_process.poll() is None:  # If the backend process is still running
            print("Attempting to gracefully terminate the backend process...")
            try:
                backend_process.terminate()
                backend_process.wait(timeout=5)
                print("Backend process terminated gracefully.")
            except subprocess.TimeoutExpired:
                print("Backend process did not terminate in time. Forcing...")
                backend_process.kill()
                print("Backend process killed forcefully.")

    # Rebuild backend if requested
    if rebuild_backend is True:
        print("Rebuilding backend...")
        try:
            subprocess.run(
                ["npx", "tsc"],
                cwd=os.path.dirname(os.path.realpath(__file__)) + "/../backend_ts",
                check=True,
                stderr=subprocess.PIPE,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            print_backend_console_output(e.stderr)
            raise e

    # Start backend
    backend_process_command = ["node", "backend_ts/build/backend.js"]
    backend_process = subprocess.Popen(
        backend_process_command,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.realpath(__file__)) + "/../",
        text=True,
    )
    # Check immediately if the backend process started successfully
    check_backend_process()  # This will raise the appropriate exception if not

    try:  # This try-except ensures cleanup of backend process
        # Setup ZMQ socket/context
        context = zmq.Context()
        socket = context.socket(zmq.PAIR)
        socket.connect("tcp://localhost:5555")
        socket.setsockopt(zmq.RCVTIMEO, 100)
        print("Frontend connected to tcp://localhost:5555.")

        try:  # This try-except ensures cleanup of ZMQ socket/context
            # Wait for initial environment state message from backend
            message_from_backend = None
            while message_from_backend is None:
                try:
                    message_from_backend = socket.recv_json()
                except zmq.Again:
                    time.sleep(0.04)

            # Main loop for CLI

            while True:
                # Print the result of the last function call and the (updated) env state
                print(SEMANTIC_STEVE_ASCII_ART)
                print("\nENV STATE:\n", message_from_backend["env_state"])
                if message_from_backend["result"] is not None:
                    print(
                        "\nRESULTS FROM LAST FUNCTION CALL:\n",
                        message_from_backend["result"],
                    )

                # Get function call from user
                input_prompt = "\nEnter function call (or 'exit' to quit): "
                sys.stdout.write(FRONTEND_CONSOLE_ESC_SEQUENCE)
                function_call_str = input(input_prompt)
                sys.stdout.write(BACKEND_CONSOLE_ESC_SEQUENCE)
                if function_call_str.lower() == "exit":
                    print("Closing Semantic Steve CLI...")
                    socket.close()
                    context.term()
                    cleanup_backend_process_if_needed()
                    break

                # Parse `function_call_str` & handle invalid syntax
                try:
                    fnc_name, args, kwargs = parse_function_call_str(function_call_str)
                except ValueError as e:
                    # Go back to the start of the loop to give the user another chance
                    # Updating the "result" (of their function call) to communicate their syntax error
                    message_from_backend["result"] = str(e)
                    continue

                # Invoke the function within the backend
                print("\nInvoking function in backend...")
                outgoing_message = {
                    "function": fnc_name,
                    "args": args,
                    "kwargs": kwargs,
                }
                socket.send_json(outgoing_message)

                # Wait for the results, continually checking if the backend has died
                message_from_backend = None
                while message_from_backend is None:
                    try:
                        message_from_backend = socket.recv_json()
                    except zmq.Again:
                        check_backend_process()
                        time.sleep(0.04)

        except BaseException as e:
            socket.close()
            context.term()
            raise e
    except BaseException as e:
        cleanup_backend_process_if_needed()
        raise e

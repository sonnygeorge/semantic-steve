import os
import json
import re
import time
import subprocess
import sys
from typing import Optional

import zmq
from termcolor import colored

BACKEND_PROCESS_CONSOLE_COLOR = "cyan"


def parse_function_call_str(
    function_call_str: str,
) -> tuple[str, list[str], dict[str, str]]:
    """
    Parse a Python function call string using regex and extract the function name,
    positional arguments, and keyword arguments.

    Args:
        function_call_str (str): A string representing a Python function call
                           e.g., "my_func(1, 2, name='John', age=30)"

    Returns:
        tuple: (function_name, args, kwargs) where:
               - function_name (str): The name of the function
               - args (list): List of positional arguments as strings
               - kwargs (dict): Dictionary of keyword arguments as strings
    """
    # Extract function name and content inside parentheses
    match = re.match(r"(\w+(?:\.\w+)*)\s*\((.*)\)$", function_call_str.strip())
    if not match:
        raise ValueError(f"Invalid function call format: {function_call_str}")

    function_name = match.group(1)
    args_str = match.group(2).strip()

    args = []
    kwargs = {}

    if not args_str:  # Empty parentheses case
        return function_name, args, kwargs

    # Parse the arguments
    in_quotes = False
    in_brackets = 0
    current_arg = ""
    for char in args_str + ",":  # Add trailing comma to process the last argument
        if char == "," and not in_quotes and in_brackets == 0:
            current_arg = current_arg.strip()
            if current_arg:
                if "=" in current_arg and re.match(r"^\w+\s*=", current_arg):
                    key, value = current_arg.split("=", 1)
                    kwargs[key.strip()] = value.strip()
                else:
                    args.append(current_arg)
            current_arg = ""
        else:
            current_arg += char
            # Track quotes (simple handling, doesn't account for escaped quotes)
            if char == '"' or char == "'":
                in_quotes = not in_quotes
            # Track brackets/parentheses level
            elif char in "([{":
                in_brackets += 1
            elif char in ")]}":
                in_brackets -= 1

    return function_name, args, kwargs


def run_textworld_cli():
    """Runs Semantic Steve as a TextWorld CLI game."""

    def check_backend_process():
        stdout, stderr = backend_process.communicate()
        if backend_process.returncode != 0:
            print(colored(stderr, BACKEND_PROCESS_CONSOLE_COLOR))
            raise subprocess.CalledProcessError(
                returncode=backend_process.returncode,
                cmd=backend_process_command,
                output=stdout,
                stderr=stderr,
            )

    def cleanup_backend_process_gracefully():
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
        else:
            print("`cleanup_backend_process_gracefully` was called but not needed.")

    # Start backend
    backend_process_command = ["node", "backend_ts/build/backend.js"]
    backend_process = subprocess.Popen(
        backend_process_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
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
                # Print the environment state and result of the last function call
                print(message_from_backend["env_state"])
                if message_from_backend["result"] is not None:
                    print(message_from_backend["result"])

                # Get function call from user
                input_prompt = "Enter function call (or 'exit' to quit): "
                function_call_str = input(input_prompt)
                if function_call_str.lower() == "exit":
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
        if e is not subprocess.CalledProcessError:  # I.e., backend hasn't already died
            cleanup_backend_process_gracefully()
        raise e

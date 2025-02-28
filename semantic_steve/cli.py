import os
import json
import re
import time
import subprocess
from typing import Optional

import zmq


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
    # Start backend
    backend_process = subprocess.Popen(
        ["node", "backend_ts/build/backend.js"],  # Command to run the compiled JS
        stdout=subprocess.PIPE,  # Capture stdout
        stderr=subprocess.PIPE,  # Capture stderr (for errors)
        text=True,  # Get strings instead of bytes
        bufsize=1,  # Line-buffered
    )

    context = zmq.Context()
    socket = context.socket(zmq.PAIR)
    socket.connect("tcp://localhost:5555")  # Connect to the backend server

    ts_message = socket.recv_json()  # Wait for initial message from ts backend

    for _ in range(1000):  # TODO: Add a proper exit condition
        print(ts_message["env_state"])
        if ts_message["result"] is not None:
            print(ts_message["result"])

        function_call_str = input("Enter function call: ")

        try:
            function_name, args, kwargs = parse_function_call_str(function_call_str)
        except ValueError as e:
            ts_message = {"result": e, "env_state": ts_message["env_state"]}
            continue

        socket.send_json(  # Send function call to ts backend
            {
                "function": function_name,
                "args": args,
                "kwargs": kwargs,
            }
        )
        ts_message = socket.recv_json()  # Wait for response from ts backend

    # Clean up
    socket.close()
    context.term()

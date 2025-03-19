#!/usr/bin/env python3
"""
Semantic Steve CLI using JSPyBridge

This script:
 • Initializes a mineflayer bot, loads its plugins (including a prismarine viewer),
   and builds a function registry.
 • Enters a CLI loop where user-entered function calls (e.g. "someFunction(1, 'arg')") 
   are parsed and invoked on the bot.
 • Prints the returned result and environment state.
"""

import ast
import json
import asyncio
import os
import subprocess
import sys
import time
import traceback
import nest_asyncio
nest_asyncio.apply()
from typing import Optional

# ------------------------------
# Colored Console Output Helpers
# ------------------------------
FRONTEND_CONSOLE_ESC_SEQUENCE = "\033[35m"
BACKEND_CONSOLE_ESC_SEQUENCE = "\033[0m"

# Overwrite print to always print colored output
_print = print
def print(*args):
    colored_args = [f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{arg}{BACKEND_CONSOLE_ESC_SEQUENCE}" for arg in args]
    _print(*colored_args)

# Custom exception hook to print errors in color
def custom_excepthook(exc_type, exc_value, exc_traceback):
    _print(f"{FRONTEND_CONSOLE_ESC_SEQUENCE}Traceback (most recent call last):{BACKEND_CONSOLE_ESC_SEQUENCE}")
    for line in traceback.format_tb(exc_traceback):
        _print(f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{line}{BACKEND_CONSOLE_ESC_SEQUENCE}")
    _print(f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{exc_type.__name__}: {exc_value}{BACKEND_CONSOLE_ESC_SEQUENCE}")

sys.excepthook = custom_excepthook

# Overwrite input so prompts appear in color
_input = input
def input(prompt: Optional[str] = None):
    if prompt is not None:
        _print(f"{FRONTEND_CONSOLE_ESC_SEQUENCE}{prompt}{BACKEND_CONSOLE_ESC_SEQUENCE}", end="")
    return _input()

# ------------------------------
# Function Call String Parser
# ------------------------------
def parse_function_call_str(function_call_str: str) -> tuple[str, list, dict]:
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

# ------------------------------
# ASCII Art Banner
# ------------------------------
SEMANTIC_STEVE_ASCII_ART = r"""  ____                             _   _        ____  _                 
 / ___|  ___ _ __ ___   __ _ _ __ | |_(_) ___  / ___|| |_ _____   _____ 
 \___ \ / _ \ '_ ` _ \ / _` | '_ \| __| |/ __| \___ \| __/ _ \ \ / / _ \
  ___) |  __/ | | | | | (_| | | | | |_| | (__   ___) | ||  __/\ V /  __/
 |____/ \___|_| |_| |_|\__,_|_| |_|\__|_|\___| |____/ \__\___| \_/ \___|"""

# ------------------------------
# JSPyBridge: Bot Initialization
# ------------------------------
from javascript import require, Once, On, AsyncTask, terminate


def compile_typescript():
    print("Compiling TypeScript...")
    try:
        subprocess.run(
            ["npx", "tsc"],
            cwd=os.path.dirname(os.path.realpath(__file__)) + "/../backend_ts",
            check=True,
            stderr=subprocess.PIPE,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        print(e.stderr)
        raise e



# ------------------------------
# Main CLI Loop
# ------------------------------
def cli_loop(bot, functionRegistry):
    
    run_cli = True
    
    @On(bot, "end")
    def on_end(*args):
        nonlocal run_cli
        print("ended")
        run_cli = False
        
    @On(bot, "error")
    def on_end(*args):
        nonlocal run_cli
        print("error")
        run_cli = False
    
    while run_cli:
   
        if not bot.entity or not bot.entity.height:
            print("Waiting for bot to spawn...")
            time.sleep(1)
            continue
        
        
        print(SEMANTIC_STEVE_ASCII_ART)
        
        # Retrieve the environment state (if available)
        env_state_str = bot.envState.getReadableString()

        print("\nENVIRONMENT STATE:")
        try:
            # Try to pretty-print JSON if possible
            env_obj = json.loads(env_state_str) if env_state_str else {}
            print(json.dumps(env_obj, indent=4))
        except Exception:
            print(env_state_str)
        
        
        
        # Use run_in_executor to avoid blocking the event loop for input
        function_call_str = input("\nEnter function call (or 'exit' to quit): ")
        if function_call_str.lower() == "exit":
            print("Exiting Semantic Steve CLI...")
            break
        try:
            fn_name, args, kwargs = parse_function_call_str(function_call_str)
        except Exception as e:
            print("Error parsing function call:", e)
            continue

        # Look up and call the function from the registry if it exists
        if fn_name not in functionRegistry:
            print(f"Error: Function '{fn_name}' not found in the function registry.")
            continue

        try:
            # Call the JS function asynchronously (passing bot as the first argument)
            result_obj = functionRegistry[fn_name](bot, *args)
        except Exception as e:
            print("Error during function call:", e)
            continue


        # If the function did not update the environment state, update it now
        if not result_obj.envStateIsUpToDate:
            bot.envState.surroundings.getSurroundings()
            
        print("\nRESULT FROM FUNCTION CALL:")
        print(result_obj.resultString or "No result returned.")

    print('Exiting CLI loop...')

def main(rebuild_backend=False):
    """
    Initializes the mineflayer bot, loads plugins and the function registry,
    waits for chunks to load, and starts the prismarine viewer.
    """

    if rebuild_backend:
        compile_typescript()

    # load required Node.js modules

    mcdata = require("minecraft-data")
    mineflayer = require("mineflayer")

    # needed for prismarine-viewer
    canvas = require("canvas")
    mfViewer = require("prismarine-viewer").mineflayer

    # where we should import our local javascript from.
    import_path = os.path.dirname(os.path.realpath(__file__)) + "/../backend_ts/build"

    # Adjust these paths as necessary; these modules should be compiled/available as JS.
    createPlugin = require(import_path).createPlugin  
    buildFunctionRegistry = require(import_path).buildFunctionRegistry

    # Create the bot
    bot = mineflayer.createBot({ "username": "SemanticSteve" })
    # Await the "spawn" event (JSPyBridge lets you await event handlers)

    bot.loadPlugin(createPlugin({ "immediateSurroundingsRadius": 3, "distantSurroundingsRadius": 24 }))
    functionRegistry = buildFunctionRegistry()
        

    @Once(bot, "spawn")
    def handler(*args):
        print("Bot spawned!")

        # Load plugin (e.g. for environment tracking)
        bot.waitForChunksToLoad()
        # Wait for chunks to load
        
        print("Chunks loaded!")
        # Start the prismarine viewer (for visualization)
        mfViewer(bot, { "port": 3000, "firstPerson": True })
        # Build and attach the semantic function registry on the bot
        
        print("Semantic Steve is ready!")
        
    cli_loop(bot, functionRegistry)
    terminate()


    

if __name__ == "__main__":
   main()
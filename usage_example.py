"""
Right now, only the CLI interface is importable. Soon, we will have a better importable
interface for controlling Semantic Steve programatically, e.g., so LLMs can "hook up" to
it easily.
"""

from semantic_steve import run_textworld_cli

run_textworld_cli(rebuild_backend=True)

import os
from typing import Any, TypeVar, ParamSpec
from collections.abc import Callable
from datetime import datetime
import inspect


P = ParamSpec("P")
T = TypeVar("T")


async def call_or_await(fn: Callable[P, Any], *args: P.args, **kwargs: P.kwargs):
    if inspect.iscoroutinefunction(fn) or inspect.isasyncgenfunction(fn):
        return await fn(*args, **kwargs)
    return fn(*args, **kwargs)


def get_latest_png_in_dir(directory: str, since_datetime: datetime) -> str | None:
    """
    Returns the name of the most recently created .png file in the specified directory
    since the given datetime. Returns None if no .png files found after that datetime.

    Args:
        directory (str): Path to the directory to search in
        since_datetime (datetime): Datetime to compare file creation times against

    Returns:
        str or None: Filename of the most recent .png file, or None if no matching files
    """
    latest_file = None
    latest_time = since_datetime

    # Check if directory exists
    if not os.path.isdir(directory):
        raise ValueError(f"Directory not found: {directory}")

    # Iterate through files in the directory
    for filename in os.listdir(directory):
        # Check if file is a .png
        if filename.lower().endswith(".png"):
            file_path = os.path.join(directory, filename)

            # Get file creation time
            # Using os.path.getctime() which returns creation time on Windows,
            # and might return last metadata change time on Unix-based systems
            creation_time = datetime.fromtimestamp(os.path.getctime(file_path))

            # If file was created after the since_datetime and is newer than our current latest
            if creation_time > since_datetime and creation_time > latest_time:
                latest_file = filename
                latest_time = creation_time

    return latest_file

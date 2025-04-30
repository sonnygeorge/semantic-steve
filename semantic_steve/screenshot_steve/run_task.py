import os
from typing import Any, Annotated, TypeAlias, TypeVar, ParamSpec
from collections.abc import Callable
import inspect
from datetime import datetime, timedelta

from pydantic import BaseModel, confloat

from semantic_steve.py.js_messages import DataFromMinecraft
from semantic_steve.py.semantic_steve import SemanticSteve
from semantic_steve.py.constants import SCREENSHORT_DIR_ENV_VAR_NAME
from semantic_steve.screenshot_steve.utils import call_or_await, get_latest_png_in_dir
from semantic_steve.screenshot_steve.schema import TaskRunResult, GetNextSkillInvocation
from semantic_steve.screenshot_steve.get_score import get_vlm_score_once


async def run_and_score_task(
    task: str,
    get_next_skill_invocation: GetNextSkillInvocation,
    semantic_steve: SemanticSteve | None = None,
    time_limit: timedelta = timedelta(minutes=45),
) -> TaskRunResult:
    n_skills_invoked = 0
    start = datetime.now()
    if semantic_steve is None:
        semantic_steve = SemanticSteve()
    with semantic_steve as ss:
        data_from_minecraft = await ss.wait_for_data_from_minecraft()
        while True:
            if datetime.now() - start > time_limit:
                print("Time limit exceeded.")
                break
            skill_invocation = await call_or_await(
                get_next_skill_invocation, data_from_minecraft
            )
            if skill_invocation is None:
                print("Task completed or dropped.")
                break
            n_skills_invoked += 1
            data_from_minecraft = await ss.invoke(skill_invocation)

    end = datetime.now()

    screenshot_dir_fpath = os.environ.get(SCREENSHORT_DIR_ENV_VAR_NAME)
    assert screenshot_dir_fpath is not None
    screenshot_fpath = get_latest_png_in_dir(screenshot_dir_fpath, since_datetime=start)

    score = 0.0 if screenshot_fpath is None else get_vlm_score_once(screenshot_fpath, task)

    return TaskRunResult(
        task=task,
        screenshot_fpath=screenshot_fpath,
        score=score,
        n_skills_invoked=n_skills_invoked,
        time_elapsed_seconds=(end - start).total_seconds(),
    )

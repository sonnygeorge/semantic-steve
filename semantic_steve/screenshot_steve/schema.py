from typing import Annotated, TypeAlias
from collections.abc import Callable

from pydantic import BaseModel, confloat
from semantic_steve.py.js_messages import DataFromMinecraft


class TaskRunResult(BaseModel):
    task: str
    screenshot_fpath: str
    score: Annotated[float, confloat(ge=0, le=1)]
    n_skills_invoked: int
    time_elapsed_seconds: float


GetNextSkillInvocation: TypeAlias = Callable[[DataFromMinecraft], str]

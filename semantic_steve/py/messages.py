from typing import Any
import json

from pydantic import BaseModel

from semantic_steve.py.schema import (
    SemanticSteveEnvState,
    ValidSkillArgument,
    InvalidSkillInvocationError,
)
from semantic_steve.py.utils import parse_python_syntax_skill_invocation


class DataFromMinecraft(BaseModel):
    env_state: SemanticSteveEnvState
    skill_invocation_results: str | None
    inventory_changes_since_last_skill_invocation: Any  # FIXME

    def get_pretty_string(self) -> str:
        return json.dumps(self.model_dump(), indent=4)  # FIXME


class SkillInvocation(BaseModel):
    skill: str
    kwargs: dict[str, ValidSkillArgument]

    @staticmethod
    def from_str(str: str) -> "SkillInvocation":
        try:
            fn_name, args, kwargs = parse_python_syntax_skill_invocation(str)
        except (SyntaxError, ValueError) as e:
            raise InvalidSkillInvocationError(f"Invalid skill invocation: {str}") from e

        return SkillInvocation(
            skill=fn_name,
            kwargs=kwargs,  # FIXME
        )

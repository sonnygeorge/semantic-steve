import json
from typing import Any

from pydantic import BaseModel

from semantic_steve.py.schema import (
    InvalidSkillInvocationError,
    ValidSkillArgument,
)
from semantic_steve.py.utils import parse_python_syntax_skill_invocation


# We get these from the JS process
class DataFromMinecraft(BaseModel):
    envState: dict
    skillInvocationResults: str | None

    def get_pretty_string(self) -> str:
        return json.dumps(self.model_dump(), indent=4)  # TODO


# We send these to the JS process
class SkillInvocation(BaseModel):
    skillName: str
    args: list[ValidSkillArgument]

    @staticmethod
    def from_str(str: str) -> "SkillInvocation":
        try:
            fn_name, args, kwargs = parse_python_syntax_skill_invocation(str)
        except (SyntaxError, ValueError) as e:
            raise InvalidSkillInvocationError(f"Invalid skill invocation: {str}") from e

        return SkillInvocation(
            skillName=fn_name,
            args=args,
        )

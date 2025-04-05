import json

from pydantic import BaseModel

from semantic_steve.py.schema import ValidSkillArgument
from semantic_steve.py.utils import SingleLineListEncoder, parse_skill_invocation


# We get these from the JS process
class DataFromMinecraft(BaseModel):
    envState: dict
    skillInvocationResults: str | None = None

    def get_readable_string(self) -> str:
        return json.dumps(self.model_dump(), indent=4, cls=SingleLineListEncoder)


# We send these to the JS process
class SkillInvocation(BaseModel):
    skillName: str
    args: list[ValidSkillArgument]

    @staticmethod
    def from_str(str: str) -> "SkillInvocation":
        fn_name, args, kwargs = parse_skill_invocation(str)
        return SkillInvocation(
            skillName=fn_name,
            args=args,
        )

from typing import TypeAlias

from pydantic import BaseModel

PrimitiveDataType: TypeAlias = None | bool | int | float | str

ValidSkillArgument = (
    PrimitiveDataType | list[PrimitiveDataType] | dict[str, PrimitiveDataType]
)

#################
## Docs Object ##
#################


class SemanticSteveDocs(BaseModel):
    user_role_as_verb_phrase: str
    skills_docs: list[str]
    tips_tutorials_and_sops: list[str]


#######################
## Custom exceptions ##
#######################


class SemanticSteveUsageError(Exception):
    pass


class InvalidSkillInvocationError(SemanticSteveUsageError):
    pass


##############################
## Semantic Steve Env State ##
##############################


class SemanticSteveEnvState(BaseModel):
    pass  # TODO

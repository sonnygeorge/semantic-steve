import asyncio

import zmq

from semantic_steve.py.constants import (
    SEMANTIC_STEVE_USER_ROLE_AS_VERB_PHRASE,
)
from semantic_steve.py.schema import (
    SemanticSteveDocs,
    SemanticSteveUsageError,
    InvalidSkillInvocationError,
)
from semantic_steve.py.js_process_manager import SemanticSteveJsProcessManager
from semantic_steve.py.messages import DataFromMinecraft, SkillInvocation


class SemanticSteve:
    def __init__(
        self,
        should_rebuild_typescript: bool = False,
        zmq_port: int = 5555,
    ):
        self.js_process_manager = SemanticSteveJsProcessManager(
            should_rebuild_typescript=should_rebuild_typescript
        )
        self.zmq_port = zmq_port
        self.socket: zmq.Socket | None = None
        self.context: zmq.Context | None = None

    ###########################
    ## Documentation getters ##
    ###########################

    @staticmethod
    def get_user_role_as_verb_phrase() -> str:
        return SEMANTIC_STEVE_USER_ROLE_AS_VERB_PHRASE

    @staticmethod
    def get_tips_tutorials_and_sops() -> list[str]:
        # TODO: Read in .md files in docs/ directory
        pass

    @staticmethod
    def get_skills_docs() -> list[str]:
        # TODO: Read in .md files in docs/ directory
        pass

    @staticmethod
    def get_docs() -> SemanticSteveDocs:
        return SemanticSteveDocs(
            user_role_as_verb_phrase=SemanticSteve.get_user_role_as_verb_phrase(),
            skills_docs=SemanticSteve.get_skills_docs(),
            tips_tutorials_and_sops=SemanticSteve.get_tips_tutorials_and_sops(),
        )

    ########################
    ## Context management ##
    ########################

    def __enter__(self):
        self.js_process_manager.__enter__()
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PAIR)
        self.socket.connect(f"tcp://localhost:{self.zmq_port}")
        self.socket.setsockopt(zmq.RCVTIMEO, -1)
        print(f"SemanticSteve python connected to tcp://localhost:{self.zmq_port}.")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self.socket is not None:
            self.socket.close()
            self.context.term()
            print(f"SemanticSteve python disconnected from tcp://localhost:{self.zmq_port}.")
        self.js_process_manager.__exit__(exc_type, exc_value, traceback)

    #####################
    ## Private helpers ##
    #####################

    def _assert_inside_context(self, mthd: str):
        if self.context is None or self.socket is None:
            msg = f"`{mthd}` must be called inside a `with SemanticSteve() as ss:` context."
            raise SemanticSteveUsageError(msg)

    ####################
    ## Public methods ##
    ####################

    async def wait_for_data_from_minecraft(self) -> DataFromMinecraft:
        self._assert_inside_context("wait_for_data_from_minecraft")
        # Await response from JS process
        data_from_minecraft_dict = None
        while data_from_minecraft_dict is None:
            try:
                data_from_minecraft_dict = self.socket.recv_json()
            except zmq.Again:
                self.js_process_manager.check_and_propogate_errors()
                asyncio.sleep(0.1)
        # Parse as object (enforcing Pydantic validation on the received message json)
        return DataFromMinecraft(**data_from_minecraft_dict)

    async def invoke(self, skill_invocation: str) -> DataFromMinecraft:
        self._assert_inside_context("invoke_skill")
        # Validate and parse skill invocation
        try:
            skill_invocation = SkillInvocation.from_str(skill_invocation)
        except InvalidSkillInvocationError:
            pass  # FIXME
        # Send message to JS process
        self.socket.send_json(skill_invocation.model_dump())
        # Await response from JS process
        return await self.wait_for_data_from_minecraft()

import asyncio
import os

import zmq

from semantic_steve.py.constants import (
    DEFAULT_PATH_TO_SCREENSHOT_DIR,
    SCREENSHORT_DIR_ENV_VAR_NAME,
    SEMANTIC_STEVE_USER_ROLE_AS_VERB_PHRASE,
)
from semantic_steve.py.js_messages import DataFromMinecraft, SkillInvocation
from semantic_steve.py.js_process import SemanticSteveJsProcessManager
from semantic_steve.py.schema import SemanticSteveDocs, SemanticSteveUsageError
from semantic_steve.py.skills_docs import generate_skills_docs
from semantic_steve.py.utils import ascertain_js_dependencies


class SemanticSteve:
    def __init__(
        self,
        zmq_port: int = 5555,
        screenshot_dir: str | os.PathLike = DEFAULT_PATH_TO_SCREENSHOT_DIR,
        # Users should never use the following args (only devs):
        _debug: bool = False,
        _should_rebuild_typescript: bool = False,
    ):
        SemanticSteve.ascertain_js_dependencies()
        self.js_process_manager = SemanticSteveJsProcessManager(
            should_rebuild_typescript=_should_rebuild_typescript, debug=_debug
        )
        os.environ[SCREENSHORT_DIR_ENV_VAR_NAME] = str(screenshot_dir)
        self.zmq_port = zmq_port
        self.debug = _debug
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
        pass  # TODO

    @staticmethod
    def get_skills_docs() -> list[str]:
        return generate_skills_docs()

    @staticmethod
    def get_docs() -> SemanticSteveDocs:
        return SemanticSteveDocs(
            user_role_as_verb_phrase=SemanticSteve.get_user_role_as_verb_phrase(),
            skills_docs=SemanticSteve.get_skills_docs(),
            tips_tutorials_and_sops=SemanticSteve.get_tips_tutorials_and_sops(),
        )

    ###################################
    ## Management of JS dependencies ##
    ###################################

    @staticmethod
    def ascertain_js_dependencies():
        """Checks if the JS dependencies are installed and installs them if not."""
        ascertain_js_dependencies()

    ########################
    ## Context management ##
    ########################

    def __enter__(self):
        self.js_process_manager.__enter__()
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PAIR)
        self.socket.connect(f"tcp://localhost:{self.zmq_port}")
        self.socket.setsockopt(zmq.RCVTIMEO, 0)
        print(f"SemanticSteve python connected to tcp://localhost:{self.zmq_port}.")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self.socket is not None:
            self.socket.close()
            self.context.term()
            print(f"Python disconnected from tcp://localhost:{self.zmq_port}.")
        self.js_process_manager.__exit__(exc_type, exc_value, traceback)

    #####################
    ## Private helpers ##
    #####################

    def _assert_called_in_context_manager_context(self, method_name: str):
        if self.context is None or self.socket is None:
            msg = f"`{method_name}` must be called in a `with SemanticSteve()...` context."
            raise SemanticSteveUsageError(msg)

    ####################
    ## Public methods ##
    ####################

    async def wait_for_data_from_minecraft(self) -> DataFromMinecraft:
        self._assert_called_in_context_manager_context(
            method_name="wait_for_data_from_minecraft"
        )
        data_from_minecraft_dict = None
        while data_from_minecraft_dict is None:
            try:
                data_from_minecraft_dict = self.socket.recv_json()
            except zmq.Again:
                self.js_process_manager.check_and_propogate_errors()
                await asyncio.sleep(0.1)  # Sleep for a short time to avoid busy waiting
        return DataFromMinecraft(**data_from_minecraft_dict)

    async def invoke(self, skill_invocation: str) -> DataFromMinecraft:
        self._assert_called_in_context_manager_context(method_name="invoke_skill")
        parsed_skill_invocation = SkillInvocation.from_str(skill_invocation)
        self.socket.send_json(parsed_skill_invocation.model_dump())
        return await self.wait_for_data_from_minecraft()

import subprocess

from semantic_steve.py.constants import (
    CMD_TO_REBUILD_TYPESCRIPT,
    CMD_TO_START_JS_PROCESS,
    PATH_TO_JS_DIR,
)


class SemanticSteveJsProcessManager:
    """Context manager responsible for opening/cleaning up the Semantic Steve JS process."""

    TERMINATE_TIMEOUT_SECONDS = 5

    def __init__(self, should_rebuild_typescript: bool = False, debug: bool = False):
        self.should_rebuild_typescript = should_rebuild_typescript
        self.debug = debug
        self.js_process: subprocess.Popen | None = None

    ########################
    ## Context management ##
    ########################

    def __enter__(self):
        if self.should_rebuild_typescript and not self.debug:  # Unneeded step if debugging
            self.rebuild_typescript()
        self.js_process = subprocess.Popen(
            CMD_TO_START_JS_PROCESS,
            stderr=subprocess.PIPE,
            stdout=subprocess.DEVNULL,  # FIXME: log?
            cwd=PATH_TO_JS_DIR,
            text=True,
        )
        self.check_and_propogate_errors()
        return self.js_process

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self._cleanup_process_if_needed(self.js_process)

    #####################
    ## Private helpers ##
    #####################

    def rebuild_typescript(self) -> None:
        # print("Rebuilding typescript...")
        try:
            subprocess.run(
                CMD_TO_REBUILD_TYPESCRIPT,
                cwd=PATH_TO_JS_DIR,
                check=True,
                stdout=subprocess.DEVNULL,  # FIXME: log?
                stderr=subprocess.PIPE,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            # FIXME
            # print(e.stderr)  # Print the JS process error message to the console
            raise e

    def _cleanup_process_if_needed(self, js_process: subprocess.Popen) -> None:
        if js_process.poll() is None:
            print("Attempting to gracefully terminate the js process...")
            try:
                js_process.terminate()
                js_process.wait(timeout=self.TERMINATE_TIMEOUT_SECONDS)
                print("Backend process terminated gracefully.")
            except subprocess.TimeoutExpired:
                print("Backend process did not terminate in time. Forcing...")
                js_process.kill()
                print("Backend process killed forcefully.")

    ####################
    ## Public methods ##
    ####################

    def check_and_propogate_errors(self) -> None:
        return_code = self.js_process.poll()
        if return_code is not None:
            _, stderr = self.js_process.communicate()
            if return_code != 0:
                print(stderr)  # Print the JS process error message to the console
                raise subprocess.CalledProcessError(
                    returncode=return_code,
                    cmd=CMD_TO_START_JS_PROCESS,
                    stderr=stderr,
                )

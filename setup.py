from setuptools import setup, Command
from setuptools.command.install import install
import subprocess
import os
import sys


class InstallNodeModules(install):
    """Custom install command to check for Node.js 22 and run yarn install."""

    def run(self):
        # Validate Node.js version
        try:
            result = subprocess.run(
                ["node", "--version"], capture_output=True, text=True, check=True
            )
            version = result.stdout.strip().lstrip("v")  # e.g., "22.1.0"
            major = int(version.split(".")[0])
            if major != 22:
                raise RuntimeError(
                    f"Node.js version {version} found, but version 22 is required. "
                    "Please install Node.js 22 from https://nodejs.org or use a version manager like nvm: "
                    "`nvm install 22`."
                )
            print("Node.js 22 detected successfully.")
        except FileNotFoundError:
            raise RuntimeError(
                "Node.js is not installed or not found in PATH. "
                "This package requires Node.js 22. Please install it from https://nodejs.org or use "
                "`nvm install 22`."
            )
        except subprocess.CalledProcessError:
            raise RuntimeError(
                "Failed to run `node --version`. Ensure Node.js 22 is installed correctly. "
                "Download from https://nodejs.org."
            )
        except ValueError:
            raise RuntimeError(
                "Could not parse Node.js version. Ensure Node.js 22 is installed correctly. "
                "Download from https://nodejs.org."
            )

        # Proceed with the standard installation
        install.run(self)

        # Run yarn install in the js directory to install JavaScript dependencies
        js_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "semantic_steve", "js"
        )

        if not os.path.exists(js_dir):
            print(f"Warning: JavaScript directory not found at {js_dir}")
        else:
            try:
                print(f"Running yarn install in {js_dir}")
                subprocess.run(
                    ["yarn", "install"],
                    cwd=js_dir,
                    check=True,
                    stdout=sys.stdout,
                    stderr=sys.stderr,
                )
                print("yarn install completed successfully.")
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"Failed to run yarn install: {e}")
            except FileNotFoundError:
                raise RuntimeError(
                    "yarn is not installed or not found in PATH. "
                    "Please install yarn using npm: `npm install -g yarn`"
                )


setup(
    cmdclass={
        "install": InstallNodeModules,
    },
)

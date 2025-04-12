from setuptools import setup, Command
from setuptools.command.install import install
import subprocess


class AscertainNodeVersion(install):
    """Custom install command to check for Node.js 22 and run yarn install."""

    def run(self):
        # Validate Node.js version
        try:
            # Check Node.js version
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


setup(
    cmdclass={
        "install": AscertainNodeVersion,
    },
)

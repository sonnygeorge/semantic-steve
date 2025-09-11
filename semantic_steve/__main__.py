from semantic_steve.py.mcp import mcp
from semantic_steve.py.constants import MCP_PORT


if __name__ == "__main__":
    mcp.run(transport="http", port=MCP_PORT)

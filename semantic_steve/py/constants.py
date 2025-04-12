import os

SEMANTIC_STEVE_USER_ROLE_AS_VERB_PHRASE = "controls a Minecraft player"

SEMANTIC_STEVE_ASCII_ART = r"""  ____                             _   _        ____  _
 / ___|  ___ _ __ ___   __ _ _ __ | |_(_) ___  / ___|| |_ _____   _____
 \___ \ / _ \ '_ ` _ \ / _` | '_ \| __| |/ __| \___ \| __/ _ \ \ / / _ \
  ___) |  __/ | | | | | (_| | | | | |_| | (__   ___) | ||  __/\ V /  __/
 |____/ \___|_| |_| |_|\__,_|_| |_|\__|_|\___| |____/ \__\___| \_/ \___|"""


CMD_TO_REBUILD_TYPESCRIPT = ["npx", "tsc"]
CMD_TO_START_JS_PROCESS = ["node", "build/main.js"]
CMD_TO_DEBUG_START_JS_PROCESS = ["npx", "ts-node", "src/main.ts"]
CMD_TO_GET_NODE_VERSION = ["node", "--version"]
CMD_TO_INSTALL_NODE_MODULES = ["yarn", "install"]
PATH_TO_JS_DIR = os.path.dirname(os.path.realpath(__file__)) + "/../js/"
PATH_TO_SKILLS_DIR = os.path.dirname(os.path.realpath(__file__)) + "/../js/src/skill/"

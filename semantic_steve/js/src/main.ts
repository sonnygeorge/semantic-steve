import { createBot } from "mineflayer";
import { createPlugin } from ".";
import { mineflayer as mfViewer } from "prismarine-viewer";

import {
  SemanticSteve,
  SemanticSteveConfig,
  SemanticSteveConfigOptions,
} from "./semantic-steve";

const config = new SemanticSteveConfig(
  {
    botHost: process.env.BOT_HOST || 'localhost',
    botPort: parseInt(process.env.BOT_PORT || "25565"),
    mfViewerPort: parseInt(process.env.MF_VIEWER_PORT || "3000"),
    zmqPort: parseInt(process.env.ZMQ_PORT || "5555"),
    immediateSurroundingsRadius: parseInt(
      process.env.IMMEDIATE_SURROUNDINGS_RADIUS || "5"
    ),
    distantSurroundingsRadius: parseInt(
      process.env.DISTANT_SURROUNDINGS_RADIUS || "13"
    ),
    username: process.env.MC_USERNAME || "SemanticSteve",
    password: process.env.MC_PASSWORD || undefined,
  } as SemanticSteveConfigOptions
);

const bot = createBot({ port: config.botPort, host: config.botHost, username: config.username, password: config.password });
bot.once("spawn", async () => {
  bot.loadPlugin(
    createPlugin({
      immediateSurroundingsRadius: config.immediateSurroundingsRadius,
      distantSurroundingsRadius: config.distantSurroundingsRadius,
    })
  );
  await bot.waitForChunksToLoad();
  mfViewer(bot, { port: config.mfViewerPort, firstPerson: true });
  const semanticSteve = new SemanticSteve(bot, config);
  semanticSteve.run();
});

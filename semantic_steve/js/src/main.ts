import { createBot } from "mineflayer";
import { createPlugin } from ".";
import { mineflayer as mfViewer } from "prismarine-viewer";

import { SemanticSteve, SemanticSteveConfig } from "./semantic-steve";

const config = new SemanticSteveConfig();

const bot = createBot({ username: "SemanticSteve" });
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

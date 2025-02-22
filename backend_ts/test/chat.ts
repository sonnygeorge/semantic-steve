import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import { handleCommand } from "./common";

const bot = createBot({
  username: "test",
});

bot.once("spawn", () => {
  const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
  bot.loadPlugin(semanticSteve);

  bot.pathfinderAbstract.on("mobCancel", (e) => {
    console.log("cancelled pathfinding due to mob: ", e);
  });

  bot.pathfinderAbstract.on("blockCancel", (b) => {
    console.log("cancelled pathfinding due to block: ", b);
  });

  bot.pathfinderAbstract.on("biomeCancel", (b, pos) => {
    console.log("cancelled pathfinding due to biome: ", b, pos);
  });
});


const prefix = "";
bot.on("chat", (username, message) => {
  if (!message.startsWith(prefix)) return;
  let author = bot.players[username].entity
  handleCommand(bot, message.replace(prefix, ""), author);
});

import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import readline from "readline";
import { handleCommand } from "./common";

const bot = createBot({
  username: "test",
});

bot.once("spawn", () => {
  const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
  bot.loadPlugin(semanticSteve);
  console.log("Bot spawned and ready for interactive CLI commands.");
  startCLI();
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


function generatePrompt(bot: Bot) {
  return `Semantic Steve 1.0.0!
  World State:
  ${bot.semanticWorld.toString()}

  [${bot.username}] > `;
}


function startCLI() {
  rl.setPrompt(generatePrompt(bot));
  rl.prompt();

  rl.on("line", async (line) => {
    await handleCommand(bot, line);
    rl.setPrompt(generatePrompt(bot));
    rl.prompt();
  });
}

bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`Chat message from ${username}: ${message}`);
  handleCommand(bot, message);
});
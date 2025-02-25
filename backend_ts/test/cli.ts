import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import readline from "readline";
import { handleCommand, handleFunctionCall } from "./common";

const bot = createBot({
  username: "SemanticSteve",
});

bot.once("spawn", () => {
  const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
  bot.loadPlugin(semanticSteve);
  console.log("Bot spawned and ready!");
  startCLI();
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


function startCLI() {  
  console.log("STATE:", bot.semanticWorld.toString())
  rl.setPrompt("Please enter your function call (JS syntax): ");
  rl.prompt();

  let result: any;
  rl.on("line", async (line) => {  // E.g., pathfindToCoordinate([-585.5, 68, 54.5])
    result = await handleFunctionCall(bot, line);
    console.log("RESULT:", result);
    console.log("STATE:", bot.semanticWorld.toString())
    rl.setPrompt("Please enter your function call (JS syntax): ");
    rl.prompt();
  });
}


bot.on("chat", (username, message) => {
  if (username === bot.username) return;
  console.log(`Chat message from ${username}: ${message}`);
  handleCommand(bot, message);
});

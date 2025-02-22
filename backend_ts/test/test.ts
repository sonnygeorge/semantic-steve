import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { PathfinderStopConditions } from "../src/movement/types";
import { Direction } from "../src/constants";

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
});

const prefix = "";
bot.on("chat", (username, message) => {
  if (!message.startsWith(prefix)) return;
  const [cmd, ...args] = message.replace(prefix, "").split(" ");
  let author = bot.players[username].entity;

  if (author == null) return bot.chat(`I can't find you, ${username}`);

  switch (cmd) {
    case "goto": {
      if (args.length < 3) return bot.chat(`Invalid coordinates`);
      const [x, y, z] = args.map(Number);
      if (x == null || y == null || z == null) return bot.chat(`Invalid coordinates`);
      bot.pathfinderAbstract.pathfindToCoordinate(new Vec3(x, y, z));
      break;
    }

    case "come": {
      const { x, y, z } = author.position;
      const entitiesToCancel = [bot.registry.entitiesByName["zombie"].id];
      const blocksToCancel = [bot.registry.blocksByName["iron_ore"].id];

      const cancelOpts: PathfinderStopConditions = {
        entities: {
          ids: entitiesToCancel,
          radius: 10,
        },
        blocks: {
          types: blocksToCancel,
          radius: 10,
        },
      };

      console.log(cancelOpts);
      bot.pathfinderAbstract.pathfindToCoordinate(new Vec3(x, y, z), cancelOpts);
      break;
    }

    case "dirBlock": {
      if (args.length < 1) return bot.chat(`Invalid block name`);
      const mdBlock = bot.registry.blocksByName[args[0]];
      if (mdBlock == null) return bot.chat(`Invalid block name`);

      const faceDir = bot.semanticWorld.getFacingDirection();
      const blocks = bot.semanticWorld.findBlocks(faceDir, { matching: mdBlock.id });

      console.log(blocks.map((b) => b));
      break;
    }

    case "biomes": {
      const biomes = bot.semanticWorld.nearbySurroundings.biomes(Direction.ALL);
      console.log(biomes);
      break;
    }

    case "info": {
      const immEntities = bot.semanticWorld.immediateSurroundings.entities;
      const faceDir = bot.semanticWorld.getFacingDirection();
      const nearbyEntities = bot.semanticWorld.nearbySurroundings.players(faceDir);


      // basic world info
      console.log(bot.semanticWorld.toString());

      // immedidate entity info, formatted to be nice to read
      console.log(
        immEntities.map((e) => {
          return {
            id: e.id,
            type: e.type,
            name: e.name,
            username: e.username,
            position: e.position,
          };
        })
      );

      // nearby entity info, formatted to be nice to read
      console.log(
        nearbyEntities.map((e) => {
          return {
            id: e.id,
            type: e.type,
            name: e.name,
            username: e.username,
            position: e.position,
          };
        })
      );
    }
  }
});

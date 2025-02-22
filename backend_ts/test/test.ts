import { createPlugin } from "../src";
import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";

const bot = createBot({
  username: "test",
});

bot.on("spawn", () => {
  const semanticSteve = createPlugin({ immediateRadius: 5, nearbyRadius: 128 });
  bot.loadPlugin(semanticSteve);
});

const prefix = "!";
bot.on("chat", (username, message) => {
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

      const cancelOpts = {
        entities: {
          ids: entitiesToCancel,
          radius: 10,
        },
      };

      bot.pathfinderAbstract.pathfindToCoordinate(new Vec3(x, y, z), cancelOpts);
      break;
    }

    case "dirBlock": {
      if (args.length < 1) return bot.chat(`Invalid block name`);
      const mdBlock = bot.registry.blocksByName[args[0]];
      if (mdBlock == null) return bot.chat(`Invalid block name`);

      const faceDir = bot.nearbySurroundings.getFacingDirection();
      const blocks = bot.nearbySurroundings.findBlocks(faceDir, { matching: mdBlock.id });

      console.log(blocks.map((b) => b));
      break;
    }

    case "info": {
      const immEntities = bot.immediateSurroundings.entities;
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

      const faceDir = bot.nearbySurroundings.getFacingDirection();
      console.log(faceDir);
      const nearbyEntities = bot.nearbySurroundings.players(faceDir);

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

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

  bot.pathfinderAbstract.on("biomeCancel", (b, pos) => {
    console.log("cancelled pathfinding due to biome: ", b, pos);
  });
});



async function pathfindToCoordinate(bot: Bot, coords: Vec3) {

  const entitiesToCancel = [bot.registry.entitiesByName["zombie"].id];
  const blocksToCancel = [bot.registry.blocksByName["iron_ore"].id];
  const biomesToCancel = [bot.registry.biomesByName['minecraft:jungle'].id]

  const cancelOpts: PathfinderStopConditions = {
    entities: {
      ids: entitiesToCancel,
      radius: 10,
    },
    blocks: {
      types: blocksToCancel,
      radius: 10,
    },
    biomes: {
      types: biomesToCancel,
      radius: 32
    }
  };

  const res = await bot.pathfinderAbstract.pathfindToCoordinate(coords, cancelOpts);
  console.log('RETURNED VALUE:', res)
}


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
      pathfindToCoordinate(bot, new Vec3(x, y, z));
      break;
    }

    case "come": {
      const { x, y, z } = author.position;
      pathfindToCoordinate(bot, new Vec3(x, y, z));
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
      const biomes1 = bot.semanticWorld.nearbySurroundings.biomes(Direction.ALL);
      for (const [num, pt] of biomes1.entries()) {
        const biome = bot.registry.biomes[num];
        console.log(num, pt, biome.displayName);
      }
      break;
    }

    case "info": {
      const immEntities = bot.semanticWorld.immediateSurroundings.entities;
      const faceDir = bot.semanticWorld.getFacingDirection();
      const nearbyEntities = bot.semanticWorld.nearbySurroundings.players(faceDir);


      // basic world info
      // console.log(bot.semanticWorld.toString());
      console.log(bot.semanticWorld.nearbySurroundings.toString())
      return;

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

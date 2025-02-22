import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Direction } from "../src/constants";
import { PathfinderStopConditions } from "../src/movement/types";
import { Entity } from "prismarine-entity";

async function pathfindToCoordinate(bot: Bot, coords: Vec3) {
  const entitiesToCancel = [bot.registry.entitiesByName["zombie"].id];
  const blocksToCancel = [bot.registry.blocksByName["iron_ore"].id];
  const biomesToCancel = [bot.registry.biomesByName["minecraft:jungle"].id];

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
      radius: 32,
    },
  };

  const res = await bot.pathfinderAbstract.pathfindToCoordinate(coords, cancelOpts);
  console.log("RETURNED VALUE:", res);
}

export async function handleCommand(bot: Bot, line: string, author?: Entity) {
  const [cmd, ...args] = line.trim().split(" ");

  switch (cmd) {
    case "goto":
      if (args.length < 3) return console.log("Invalid coordinates");
      const [x, y, z] = args.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) return console.log("Invalid coordinates");
      await pathfindToCoordinate(bot, new Vec3(x, y, z));
      break;

    case "come":
      if (!author) return console.log("No author found");
      const { x: cx, y: cy, z: cz } = author.position;
      await pathfindToCoordinate(bot, new Vec3(cx, cy, cz));
      break;

    case "dirBlock":
      if (args.length < 1) return console.log("Invalid block name");
      const mdBlock = bot.registry.blocksByName[args[0]];
      if (!mdBlock) return console.log("Invalid block name");
      const faceDir = bot.semanticWorld.getFacingDirection();
      const blocks = bot.semanticWorld.findBlocks(faceDir, { matching: mdBlock.id });
      console.log(blocks);
      break;

    case "biomes":
      const biomes = bot.semanticWorld.nearbySurroundings.biomes(Direction.ALL);
      for (const [num, pt] of biomes.entries()) {
        const biome = bot.registry.biomes[num];
        console.log(num, pt, biome.displayName);
      }
      break;

    case "info":
      const immEntities = bot.semanticWorld.immediateSurroundings.entities;
      const faceDirInfo = bot.semanticWorld.getFacingDirection();
      const nearbyEntities = bot.semanticWorld.nearbySurroundings.players(faceDirInfo);
      console.log("Immediate Entities:", immEntities);
      console.log("Nearby Entities:", nearbyEntities);
      break;

    default:
      console.log("Unknown command");
  }
}

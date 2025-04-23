"use strict";
// import { Bot } from "mineflayer";
// import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
// import { once } from "events";
// import { MineBlocksResults } from "./results";
// import {
//   findBlocksOfType,
//   blockRequiresTool,
//   getBestToolForBlock,
// } from "./utils";
// import { MAX_MINING_REACH } from "../../constants";
// import { Block } from "../../thing";
// export class MineBlocks extends Skill {
//   public static readonly TIMEOUT_MS: number = 20000; // 20 seconds
//   public static readonly METADATA: SkillMetadata = {
//     name: "mineBlocks",
//     signature: "mineBlocks(item: string, quantity: number = 1)",
//     docstring: `
//         /**
//          * Auto-equipping the best tool for the job, attempts to mine the specified
//          * quantity of the specified block, assuming the block(s) is/are in the immediate
//          * surroundings.
//          *
//          * @param block - The block to mine.
//          * @param quantity - Optional quantity to mine. Defaults to 1.
//          */
//       `,
//   };
//   private blockToMine?: Block;
//   constructor(bot: Bot, onResolution: SkillResolutionHandler) {
//     super(bot, onResolution);
//   }
//   public async invoke(block: string, quantity: number = 1): Promise<void> {
//     try {
//       this.blockToMine = new Block(this.bot, block);
//     } catch (err) {
//       return this.onResolution(new MineBlocksResults.InvalidBlock(block));
//     }
//     if (!this.blockToMine.isVisibleInImmediateSurroundings()) {
//       return this.onResolution(
//         new MineBlocksResults.BlockNotInImmediateSurroundings(block)
//       );
//     }
//   }
// }

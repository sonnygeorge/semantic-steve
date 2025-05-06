"use strict";
// import { Bot } from "mineflayer";
// import { isBlockVisible } from "./visibility";
// import { Block as PBlock } from "prismarine-block";
// import { simplify as nbtSimplify } from "prismarine-nbt";
// export function getBestToolForBlockHarvest(bot: Bot, blockID: number): any {
//   const block = new PBlock(blockID, 0, 0); // Default metadata/stateId
//   const effects = bot.entity.effects;
//   let fastest = Number.MAX_VALUE;
//   // If no tools, return null
//   if (tools.length === 0) return null;
//   // Sort tools by efficiency (this is a simplified version)
//   // In a real implementation, you would check material effectiveness against block types
//   const toolsByEfficiency = tools.sort((a, b) => {
//     const materialOrder = [
//       "wooden",
//       "stone",
//       "iron",
//       "golden",
//       "diamond",
//       "netherite",
//     ];
//     const getMaterialIndex = (itemName: string) => {
//       for (let i = 0; i < materialOrder.length; i++) {
//         if (itemName.startsWith(materialOrder[i])) return i;
//       }
//       return -1;
//     };
//     return getMaterialIndex(b.name) - getMaterialIndex(a.name);
//   });
//   return toolsByEfficiency[0];
// }
// /**
//  * Check if a block requires a specific tool to mine
//  * @param bot The bot instance
//  * @param blockType The type of block to check
//  * @returns True if a specific tool is required, false otherwise
//  */
// export function blockRequiresTool(bot: Bot, blockType: string): boolean {
//   // This is a simplified check - in real implementation,
//   // you would check block hardness and required tool level
//   const hardBlocks = [
//     "stone",
//     "cobblestone",
//     "ores",
//     "obsidian",
//     "iron_ore",
//     "gold_ore",
//     "diamond_ore",
//     "netherite_ore",
//   ];
//   return hardBlocks.some((type) => blockType.includes(type));
// }

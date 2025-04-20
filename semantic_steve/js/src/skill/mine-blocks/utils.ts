import { Bot } from "mineflayer";
import { isBlockVisible } from "../../utils/visibility";

/**
 * Find blocks of the specified type near the bot
 * @param bot The bot instance
 * @param blockType The type of block to find
 * @param maxDistance Maximum distance to search for blocks
 * @param count Maximum number of blocks to find
 * @returns Array of block positions
 */
export function findBlocksOfType(
  bot: Bot,
  blockType: string,
  maxDistance = 16,
  count = 64,
): any[] {
  const blockPositions = bot.findBlocks({
    matching: (block) =>
      block.name === blockType && isBlockVisible(bot, block, block.position),
    useExtraInfo: true,
    maxDistance: maxDistance,
    count: count,
  });

  return blockPositions
    .map((pos) => bot.blockAt(pos))
    .filter((block) => block !== null);
}

/**
 * Get the best tool from inventory for mining a specific block
 * @param bot The bot instance
 * @param blockType The type of block to mine
 * @returns The best tool for the job, or null if no suitable tool found
 */
export function getBestToolForBlock(bot: Bot, blockType: string): any {
  // Get all tools from inventory
  const tools = bot.inventory
    .items()
    .filter(
      (item) =>
        item.name.endsWith("_pickaxe") ||
        item.name.endsWith("_axe") ||
        item.name.endsWith("_shovel") ||
        item.name.endsWith("_hoe"),
    );

  // If no tools, return null
  if (tools.length === 0) return null;

  // Try to find the most efficient tool for the block
  const block = bot.registry.blocksByName[blockType];
  if (!block) return null;

  // Sort tools by efficiency (this is a simplified version)
  // In a real implementation, you would check material effectiveness against block types
  const toolsByEfficiency = tools.sort((a, b) => {
    const materialOrder = [
      "wooden",
      "stone",
      "iron",
      "golden",
      "diamond",
      "netherite",
    ];
    const getMaterialIndex = (itemName: string) => {
      for (let i = 0; i < materialOrder.length; i++) {
        if (itemName.startsWith(materialOrder[i])) return i;
      }
      return -1;
    };

    return getMaterialIndex(b.name) - getMaterialIndex(a.name);
  });

  return toolsByEfficiency[0];
}

/**
 * Check if a block requires a specific tool to mine
 * @param bot The bot instance
 * @param blockType The type of block to check
 * @returns True if a specific tool is required, false otherwise
 */
export function blockRequiresTool(bot: Bot, blockType: string): boolean {
  // This is a simplified check - in real implementation,
  // you would check block hardness and required tool level
  const hardBlocks = [
    "stone",
    "cobblestone",
    "ores",
    "obsidian",
    "iron_ore",
    "gold_ore",
    "diamond_ore",
    "netherite_ore",
  ];

  return hardBlocks.some((type) => blockType.includes(type));
}

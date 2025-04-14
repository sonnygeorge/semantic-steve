import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

/**
 * Checks if the bot has a crafting table in their inventory
 * @returns The crafting table item if found, null otherwise
 */
export function hasCraftingTableInInventory(bot: Bot) {
  const craftingTableItem = bot.inventory
    .items()
    .find((item) => item.name === "crafting_table");
  return craftingTableItem || null;
}

/**
 * Finds a crafting table block near the bot
 * @param bot The bot instance
 * @param maxDistance Maximum distance to search for a crafting table
 * @returns The crafting table block if found, null otherwise
 */
export function findNearbyCraftingTable(bot: Bot, maxDistance = 4) {
  const craftingTable = bot.findBlock({
    matching: (block) => block.name === "crafting_table",
    maxDistance: maxDistance,
  });
  return craftingTable || null;
}

/**
 * Finds a suitable position to place a block near the bot
 * @param bot The bot instance
 * @returns An object containing reference block and face vector if found, null otherwise
 */
export function findSuitablePlacementPosition(bot: Bot) {
  // Try to find a solid block with an empty space above it
  const solidBlocks = bot.findBlocks({
    matching: (block) => {
      // Check if the block is solid
      if (block.boundingBox !== "block") return false;

      // Check if there's an empty space above it
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
      return !!blockAbove && blockAbove.name === "air";
    },
    maxDistance: 3,
    count: 5, // Look for a few options
  });

  if (solidBlocks.length === 0) return null;

  // Sort by distance to player
  solidBlocks.sort((a, b) => {
    const distA = bot.entity.position.distanceTo(bot.blockAt(a)!.position);
    const distB = bot.entity.position.distanceTo(bot.blockAt(b)!.position);
    return distA - distB;
  });

  // Get the closest block
  const closestPosition = solidBlocks[0];
  const referenceBlock = bot.blockAt(closestPosition)!;

  // Create a reference to the top face of the block
  return {
    referenceBlock: referenceBlock,
    faceVector: new Vec3(0, 1, 0),
  };
}

/**
 * Attempts to place a crafting table from the bot's inventory
 * @param bot The bot instance
 * @returns True if successfully placed, false otherwise
 */
export async function placeCraftingTable(bot: Bot): Promise<boolean> {
  try {
    const craftingTableItem = hasCraftingTableInInventory(bot);
    if (!craftingTableItem) return false;

    // Equip the crafting table
    await bot.equip(craftingTableItem, "hand");

    // Find a suitable place to put the crafting table
    const placementPosition = findSuitablePlacementPosition(bot);
    if (!placementPosition) return false;

    // Place the crafting table
    await bot.placeBlock(
      placementPosition.referenceBlock,
      placementPosition.faceVector
    );
    return true;
  } catch (error) {
    console.error("Error placing crafting table:", error);
    return false;
  }
}

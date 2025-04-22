import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { Block as PBlock } from "prismarine-block";
import { Effect } from "prismarine-entity";

export function isBlock(
  block: PBlock | null,
  allowedBoundingBoxes?: string[],
): boolean {
  if (block === null || block.type === 0) {
    return false;
  }

  let isAnAllowedBoundBox = true;
  if (allowedBoundingBoxes) {
    isAnAllowedBoundBox = allowedBoundingBoxes.includes(block.boundingBox);
  }
  return isAnAllowedBoundBox;
}

export function blockExistsAt(
  bot: Bot,
  coords: Vec3,
  allowedBoundingBoxes?: string[],
): boolean {
  const block = bot.blockAt(coords);
  return isBlock(block, allowedBoundingBoxes);
}

export function getDigTimeMS(
  bot: Bot,
  blockID: number,
  toolID: number | null = null,
  enchantments: {
    name: string;
    level: number;
  }[] = [], // e.g., [{ name: 'efficiency', level: 2 }]
  effects?: Effect[],
  underwater = false,
  notOnGround = false,
  aquaAffinity = false,
): number {
  // Get block data
  const block = bot.registry.blocks[blockID];
  if (!block) {
    throw new Error(`Block ${blockID} not found in minecraft-data`);
  }

  // Check if block is diggable
  if (!block.diggable || block.hardness === null || block.hardness < 0) {
    return Infinity; // Non-diggable blocks (e.g., bedrock, water) take infinite time
  }

  // Get tool data (if provided)
  let tool = null;
  if (toolID) {
    tool = bot.registry.items[toolID];
    if (!tool) {
      throw new Error(`Tool ${toolID} not found in minecraft-data`);
    }
  }

  // Determine if the tool can harvest the block
  let canHarvest = true;
  if (block.harvestTools && tool) {
    canHarvest = !!block.harvestTools[tool.id];
  } else if (block.harvestTools && !tool) {
    canHarvest = false; // Tool required but none provided
  }

  // Base dig speed
  let digSpeed = 1; // Default speed (bare hands)

  if (tool) {
    // Get tool material multiplier (approximate values from Minecraft)
    type Material =
      | "wooden"
      | "stone"
      | "iron"
      | "diamond"
      | "netherite"
      | "gold";
    const materialMultipliers: Record<Material, number> = {
      wooden: 2,
      stone: 4,
      iron: 6,
      diamond: 8,
      netherite: 9,
      gold: 12,
    };
    const toolType = tool.name.split("_")[1]; // e.g., 'diamond_pickaxe' -> 'pickaxe'
    const material = tool.name.split("_")[0]; // e.g., 'diamond_pickaxe' -> 'diamond'

    // Check if tool is appropriate for block material
    const blockMaterial = block.material || "default";
    const isEffective =
      (blockMaterial.includes("rock") && toolType === "pickaxe") ||
      (blockMaterial.includes("dirt") && toolType === "shovel") ||
      (blockMaterial.includes("wood") && toolType === "axe") ||
      (blockMaterial.includes("plant") && toolType === "hoe");

    if (isEffective && canHarvest) {
      digSpeed = materialMultipliers[material as Material] || 1;
    }
  }

  // Apply efficiency enchantment
  const efficiency = enchantments.find((e) => e.name === "efficiency");
  if (efficiency && efficiency.level > 0) {
    digSpeed += efficiency.level * efficiency.level + 1;
  }

  // Apply haste, mining fatigue, and other any other effects

  // Adjust for inability to harvest
  if (!canHarvest) {
    digSpeed /= 5; // Slower if tool can't harvest (e.g., breaking stone with hands)
  }

  // Calculate base dig time (in seconds)
  let digTime = block.hardness / digSpeed;

  // Environmental modifiers
  if (underwater && !aquaAffinity) {
    digTime *= 5; // 5x slower underwater without Aqua Affinity
  }
  if (notOnGround) {
    digTime *= 5; // 5x slower if not on ground
  }

  // Convert to milliseconds and round up to nearest tick (1/20th of a second)
  digTime = Math.ceil((digTime * 1000) / 50) * 50;

  return digTime;
}

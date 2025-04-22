"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlock = isBlock;
exports.blockExistsAt = blockExistsAt;
exports.getDigTimeMS = getDigTimeMS;
exports.isWithinInteractionReach = isWithinInteractionReach;
const constants_1 = require("../constants");
function isBlock(block, allowedBoundingBoxes) {
    if (block === null || block.type === 0) {
        return false;
    }
    let isAnAllowedBoundBox = true;
    if (allowedBoundingBoxes) {
        isAnAllowedBoundBox = allowedBoundingBoxes.includes(block.boundingBox);
    }
    return isAnAllowedBoundBox;
}
function blockExistsAt(bot, coords, allowedBoundingBoxes) {
    const block = bot.blockAt(coords);
    return isBlock(block, allowedBoundingBoxes);
}
function getDigTimeMS(bot, blockID, toolID = null, enchantments = [], // e.g., [{ name: 'efficiency', level: 2 }]
effects, underwater = false, notOnGround = false, aquaAffinity = false) {
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
    }
    else if (block.harvestTools && !tool) {
        canHarvest = false; // Tool required but none provided
    }
    // Base dig speed
    let digSpeed = 1; // Default speed (bare hands)
    if (tool) {
        const materialMultipliers = {
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
        const isEffective = (blockMaterial.includes("rock") && toolType === "pickaxe") ||
            (blockMaterial.includes("dirt") && toolType === "shovel") ||
            (blockMaterial.includes("wood") && toolType === "axe") ||
            (blockMaterial.includes("plant") && toolType === "hoe");
        if (isEffective && canHarvest) {
            digSpeed = materialMultipliers[material] || 1;
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
function isWithinInteractionReach(bot, coords, maxDistance = constants_1.MAX_PLACEMENT_REACH) {
    const distance = bot.entity.position.distanceTo(coords);
    return distance <= maxDistance;
}

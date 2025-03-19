import { Bot } from 'mineflayer';
import { Vec3 } from 'vec3';
import { Block } from 'prismarine-block';

/**
 * Abstract base class for Minecraft structures
 */
abstract class MinecraftStructure {
  /** Name of the structure */
  abstract readonly name: string;
  
  /** Key blocks that identify this structure */
  abstract readonly keyBlocks: Array<string>;
  
  /** Structure instances found during search */
  protected structures: Array<{
    keyBlocksFound: Set<string>,
    minPos: Vec3,
    maxPos: Vec3,
    allPositions: Set<string>
  }> = [];
  
  /** Current structure being processed */
  protected currentStructure: number = -1;
  
  /**
   * Initializes a new structure search
   */
  initiateSearch(): void {
    this.structures = [];
  }
  
  /**
   * Processes a single block during search
   * @param block The block to process
   * @param pos Position of the block
   * @returns Array of positions to continue searching from
   */
  abstract processBlock(block: Block, pos: Vec3): Vec3[];
  
  /**
   * Finalizes a structure search and returns results
   * @returns Array of found structures with their bounding boxes
   */
  cleanupSearch(): Array<{
    type: string,
    boundingBox: { min: Vec3, max: Vec3 }
  }> {
    const validStructures = this.structures.filter(structure => 
      this.isValidStructure(structure.keyBlocksFound)
    );
    
    const results = validStructures.map(structure => ({
      type: this.name,
      boundingBox: {
        min: structure.minPos,
        max: structure.maxPos
      }
    }));
    
    // Reset state
    this.structures = [];
    this.currentStructure = -1;
    
    return results;
  }
  
  /**
   * Determines if the collected key blocks constitute a valid structure
   * @param keyBlocksFound Set of key block types found
   * @returns Whether this is a valid structure
   */
  protected abstract isValidStructure(keyBlocksFound: Set<string>): boolean;
  
  /**
   * Determines if a block is part of the current structure
   * @param block Block to check
   * @param pos Position of the block
   * @returns Whether the block belongs to this structure
   */
  protected abstract isStructureBlock(block: Block, pos: Vec3): boolean;
  
  /**
   * Starts a new structure at the given position
   * @param block First block in the structure
   * @param pos Position of the first block
   */
  protected startNewStructure(block: Block, pos: Vec3): void {
    const keyBlocksFound = new Set<string>();
    if (this.keyBlocks.includes(block.name)) {
      keyBlocksFound.add(block.name);
    }
    
    const posKey = this.getPosKey(pos);
    const allPositions = new Set<string>([posKey]);
    
    this.structures.push({
      keyBlocksFound,
      minPos: pos.clone(),
      maxPos: pos.clone(),
      allPositions
    });
    
    this.currentStructure = this.structures.length - 1;
  }
  
  /**
   * Updates the current structure with a new block
   * @param block Block to add
   * @param pos Position of the block
   */
  protected updateCurrentStructure(block: Block, pos: Vec3): void {
    if (this.currentStructure === -1) return;
    
    const structure = this.structures[this.currentStructure];
    const posKey = this.getPosKey(pos);
    
    // Skip if position already processed for this structure
    if (structure.allPositions.has(posKey)) return;
    structure.allPositions.add(posKey);
    
    // Track key blocks
    if (this.keyBlocks.includes(block.name)) {
      structure.keyBlocksFound.add(block.name);
    }
    
    // Update bounding box
    structure.minPos.x = Math.min(structure.minPos.x, pos.x);
    structure.minPos.y = Math.min(structure.minPos.y, pos.y);
    structure.minPos.z = Math.min(structure.minPos.z, pos.z);
    
    structure.maxPos.x = Math.max(structure.maxPos.x, pos.x);
    structure.maxPos.y = Math.max(structure.maxPos.y, pos.y);
    structure.maxPos.z = Math.max(structure.maxPos.z, pos.z);
  }
  
  /**
   * Gets a unique string key for a position
   * @param pos Position to convert
   * @returns String key
   */
  protected getPosKey(pos: Vec3): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }
}

/**
 * Class representing a Nether Fortress structure
 */
class NetherFortress extends MinecraftStructure {
  readonly name = "Nether Fortress";
  
  // Key blocks that identify a nether fortress
  readonly keyBlocks = [
    "nether_bricks",
    "nether_brick_fence",
    "nether_brick_stairs"
  ];
  
  // Additional structure blocks that aren't key identifiers
  private readonly structureBlocks = [
    "nether_bricks",
    "nether_brick_fence",
    "nether_brick_stairs",
    "nether_wart",
    "blaze_spawner",
    "chest"
  ];
  
  // Required key blocks to confirm fortress
  private readonly requiredBlocks = ["nether_bricks"];
  
  /**
   * Processes a block during fortress search
   * @param block The block to process
   * @param pos Position of the block
   * @returns Array of positions to continue searching from
   */
  processBlock(block: Block, pos: Vec3): Vec3[] {
    if (!block || block.name === 'air') return [];
    
    // Check if the block belongs to a fortress
    if (!this.isStructureBlock(block, pos)) return [];
    
    // Determine if this is part of an existing structure or a new one
    if (this.currentStructure === -1 || !this.isConnectedToCurrentStructure(pos)) {
      this.startNewStructure(block, pos);
    } else {
      this.updateCurrentStructure(block, pos);
    }
    
    // Return neighbor positions to check
    return [
      new Vec3(pos.x + 1, pos.y, pos.z),
      new Vec3(pos.x - 1, pos.y, pos.z),
      new Vec3(pos.x, pos.y + 1, pos.z),
      new Vec3(pos.x, pos.y - 1, pos.z),
      new Vec3(pos.x, pos.y, pos.z + 1),
      new Vec3(pos.x, pos.y, pos.z - 1)
    ];
  }
  
  /**
   * Determines if a block is part of a nether fortress
   * @param block Block to check
   * @returns Whether the block belongs to a fortress
   */
  protected isStructureBlock(block: Block, pos: Vec3): boolean {
    return this.structureBlocks.includes(block.name);
  }
  
  /**
   * Checks if a position is connected to the current structure
   * @param pos Position to check
   * @returns Whether the position is connected
   */
  private isConnectedToCurrentStructure(pos: Vec3): boolean {
    if (this.currentStructure === -1) return false;
    
    const structure = this.structures[this.currentStructure];
    
    // Check if position is within reasonable distance of structure bounds
    const maxDistance = 3; // Maximum gap between fortress components
    
    if (pos.x < structure.minPos.x - maxDistance || pos.x > structure.maxPos.x + maxDistance ||
        pos.y < structure.minPos.y - maxDistance || pos.y > structure.maxPos.y + maxDistance ||
        pos.z < structure.minPos.z - maxDistance || pos.z > structure.maxPos.z + maxDistance) {
      return false;
    }
    
    // Check for neighboring blocks in the same structure
    for (const offset of [
      new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
      new Vec3(0, 1, 0), new Vec3(0, -1, 0),
      new Vec3(0, 0, 1), new Vec3(0, 0, -1)
    ]) {
      const neighborPos = pos.plus(offset);
      const neighborKey = this.getPosKey(neighborPos);
      
      if (structure.allPositions.has(neighborKey)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Determines if the collected key blocks constitute a valid fortress
   * @param keyBlocksFound Set of key block types found
   * @returns Whether this is a valid fortress
   */
  protected isValidStructure(keyBlocksFound: Set<string>): boolean {
    // Must have all required blocks
    return this.requiredBlocks.every(block => keyBlocksFound.has(block));
  }
}

/**
 * Main plugin class for structure finding
 */
class StructureFinderPlugin {
  private bot: Bot;
  private structures: MinecraftStructure[] = [];
  
  /**
   * Creates a new structure finder plugin
   * @param bot The Mineflayer bot
   */
  constructor(bot: Bot) {
    this.bot = bot;
    
    // Register built-in structures
    this.registerStructure(new NetherFortress());
  }
  
  /**
   * Register a custom structure type
   * @param structure Structure to register
   */
  registerStructure(structure: MinecraftStructure): void {
    this.structures.push(structure);
  }
  
  /**
   * Searches for all registered structure types
   * @param startPos Starting position (defaults to bot position)
   * @param maxDistance Maximum search distance
   * @returns Array of found structures with their info
   */
  findStructures(
    startPos?: Vec3,
    maxDistance: number = 32
  ): Array<{
    type: string,
    boundingBox: { min: Vec3, max: Vec3 }
  }> {
    const pos = startPos || this.bot.entity.position.clone();
    
    // Initialize structures
    this.structures.forEach(structure => structure.initiateSearch());
    
    // Set of already checked positions
    const checked = new Set<string>();
    
    // Queue of positions to check
    const queue: Vec3[] = [pos.clone()];
    
    while (queue.length > 0) {
      const currentPos = queue.shift()!;
      const posKey = `${currentPos.x},${currentPos.y},${currentPos.z}`;
      
      // Skip if already checked
      if (checked.has(posKey)) continue;
      checked.add(posKey);
      
      // Skip if outside search distance
      if (currentPos.distanceTo(pos) > maxDistance) continue;
      
      // Get block at position
      const block = this.bot.blockAt(currentPos);
      if (!block) continue;
      
      // Process block with each structure type
      for (const structure of this.structures) {
        const nextPositions = structure.processBlock(block, currentPos);
        
        // Add new positions to queue
        for (const nextPos of nextPositions) {
          const nextPosKey = `${nextPos.x},${nextPos.y},${nextPos.z}`;
          if (!checked.has(nextPosKey) && nextPos.distanceTo(pos) <= maxDistance) {
            queue.push(nextPos);
          }
        }
      }
    }
    
    // Get results from all structures
    let results: Array<{
      type: string,
      boundingBox: { min: Vec3, max: Vec3 }
    }> = [];
    
    for (const structure of this.structures) {
      results = results.concat(structure.cleanupSearch());
    }
    
    return results;
  }
}

/**
 * Plugin initialization function
 * @param bot The Mineflayer bot
 */
function plugin(bot: Bot): void {
  const structureFinder = new StructureFinderPlugin(bot);
  
  // Add plugin to bot
  bot.structureFinder = structureFinder;
  
  // Add commands
  bot.on('chat', (username, message) => {
    if (message === '!findstructures') {
      const structures = structureFinder.findStructures();
      
      if (structures.length === 0) {
        bot.chat('No structures found nearby.');
      } else {
        for (const { type, boundingBox } of structures) {
          bot.chat(`Found ${type} from ${JSON.stringify(boundingBox.min)} to ${JSON.stringify(boundingBox.max)}`);
        }
      }
    }
  });
}

// TypeScript declaration merging to add the plugin to the Bot type
declare module 'mineflayer' {
  interface Bot {
    structureFinder: StructureFinderPlugin;
  }
}

// Export the plugin
export default plugin;


// test 

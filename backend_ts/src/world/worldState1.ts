import { Bot, FindBlockOptions } from "mineflayer";
import { Vec3 } from "vec3";
import type { Item as PItem } from "prismarine-item";
import type { Block as PBlock } from "prismarine-block";
import { Entity } from "prismarine-entity";
import { SemanticOptions } from "../types";
import { PCChunkCoordinateAndColumn } from "./types";
import { AABB } from "@nxg-org/mineflayer-util-plugin";

// Direction enum to match the Python implementation
export enum Direction {
  UP = "up",
  DOWN = "down",
  NORTH = "north",
  NORTHEAST = "northeast",
  EAST = "east",
  SOUTHEAST = "southeast",
  SOUTH = "south",
  SOUTHWEST = "southwest",
  WEST = "west",
  NORTHWEST = "northwest"
}

// Vicinity enum to match the Python implementation
export enum Vicinity {
  IMMEDIATE = "immediate",
  UP = Direction.UP,
  DOWN = Direction.DOWN,
  NORTH = Direction.NORTH,
  NORTHEAST = Direction.NORTHEAST,
  EAST = Direction.EAST,
  SOUTHEAST = Direction.SOUTHEAST,
  SOUTH = Direction.SOUTH,
  SOUTHWEST = Direction.SOUTHWEST,
  WEST = Direction.WEST,
  NORTHWEST = Direction.NORTHWEST
}

// ImmediateSurroundings class to match the Python implementation
export class ImmediateSurroundings {
  blocks: Map<string, Vec3[]> | null = null; // k=block type, v=list of coords of this block type
  biomes: Set<number> | null = null; // Set of biomes
  entities: Entity[] | null = null;
  
  constructor() {
    this.blocks = new Map<string, Vec3[]>();
    this.biomes = new Set<number>();
    this.entities = [];
  }
}

// DistantSurroundingsInADirection class to match the Python implementation
export class DistantSurroundingsInADirection {
  blocks: Map<string, number> | null = null; // E.g., a map where k=block type, v=block type count
  biomes: Map<number, Vec3> | null = null; // k=biome id, v=closest coords
  mobs: Entity[] | null = null;
  players: Entity[] | null = null;
  itemEntities: Entity[] | null = null;
  blockEntities: Map<string, any> | null = null;
  
  constructor() {
    this.blocks = new Map<string, number>();
    this.biomes = new Map<number, Vec3>();
    this.mobs = [];
    this.players = [];
    this.itemEntities = [];
    this.blockEntities = new Map<string, any>();
  }
}

// Type for DistantSurroundings map
export type DistantSurroundings = Map<Direction, DistantSurroundingsInADirection>;

// Helper constants
const NEARBY_BLOCK_VIS_OFFSETS: Vec3[] = [
  new Vec3(1, 0, 0),
  new Vec3(-1, 0, 0),
  new Vec3(0, 1, 0),
  new Vec3(0, -1, 0),
  new Vec3(0, 0, 1),
  new Vec3(0, 0, -1),
];

// Direction angle mapping
const DIRECTION_ANGLES = {
  [Direction.NORTH]: 0,
  [Direction.NORTHEAST]: 45,
  [Direction.EAST]: 90,
  [Direction.SOUTHEAST]: 135,
  [Direction.SOUTH]: 180,
  [Direction.SOUTHWEST]: 225,
  [Direction.WEST]: 270,
  [Direction.NORTHWEST]: 315
};

// Helper function to find direction from yaw
export function findDir(yaw: number): Direction {
  // Normalize yaw to 0-360
  while (yaw < 0) yaw += 360;
  while (yaw >= 360) yaw -= 360;
  
  if (yaw >= 337.5 || yaw < 22.5) return Direction.NORTH;
  if (yaw >= 22.5 && yaw < 67.5) return Direction.NORTHEAST;
  if (yaw >= 67.5 && yaw < 112.5) return Direction.EAST;
  if (yaw >= 112.5 && yaw < 157.5) return Direction.SOUTHEAST;
  if (yaw >= 157.5 && yaw < 202.5) return Direction.SOUTH;
  if (yaw >= 202.5 && yaw < 247.5) return Direction.SOUTHWEST;
  if (yaw >= 247.5 && yaw < 292.5) return Direction.WEST;
  if (yaw >= 292.5 && yaw < 337.5) return Direction.NORTHWEST;
  
  return Direction.NORTH; // Default
}

// Helper function to check if a position is within a direction
export function offsetIsWithinDirection(pos: Vec3, origin: Vec3, direction: Direction): boolean {
  if (direction === Direction.UP) {
    return pos.y > origin.y;
  }
  
  if (direction === Direction.DOWN) {
    return pos.y < origin.y;
  }
  
  // For horizontal directions
  const dx = pos.x - origin.x;
  const dz = pos.z - origin.z;
  
  // Calculate angle
  let angle = Math.atan2(dx, -dz) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  
  const dirAngle = DIRECTION_ANGLES[direction];
  
  // Define direction range (45 degrees for cardinal + ordinal directions)
  const halfRange = 22.5;
  let minAngle = dirAngle - halfRange;
  let maxAngle = dirAngle + halfRange;
  
  // Handle wrapping around 0/360
  if (minAngle < 0) minAngle += 360;
  if (maxAngle >= 360) maxAngle -= 360;
  
  // Check if angle is within range
  if (minAngle > maxAngle) {
    // Wrapping case (e.g., northwest)
    return angle >= minAngle || angle <= maxAngle;
  } else {
    return angle >= minAngle && angle <= maxAngle;
  }
}

export class Surroundings {
  private bot: Bot;
  private immediateRadius: number;
  private distantRadius: number;
  private lastObservedImmediateSurroundings: ImmediateSurroundings | null = null;
  private lastObservedDistantSurroundings: DistantSurroundings | null = null;
  private timeOfLastObservation: Date = new Date(0); // Jan 1 1970
  
  constructor(bot: Bot, opts: SemanticOptions) {
    this.bot = bot;
    this.immediateRadius = opts.immediateRadius;
    this.distantRadius = opts.nearbyRadius;
  }
  
  private getVicinityAndDistance(position: Vec3): [Vicinity | null, number] {
    const botPos = this.bot.entity.position;
    const distance = botPos.distanceTo(position);
    
    // Check if it's too far
    if (distance > this.distantRadius) {
      return [null, distance];
    }
    
    // Check if it's within immediate surroundings
    if (distance <= this.immediateRadius) {
      return [Vicinity.IMMEDIATE, distance];
    }
    
    // Otherwise, determine direction
    if (position.y > botPos.y + 3) {
      return [Vicinity.UP, distance];
    } else if (position.y < botPos.y - 3) {
      return [Vicinity.DOWN, distance];
    }
    
    // Determine horizontal direction
    const dx = position.x - botPos.x;
    const dz = position.z - botPos.z;
    let angle = Math.atan2(dx, -dz) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    if (angle >= 337.5 || angle < 22.5) return [Vicinity.NORTH, distance];
    if (angle >= 22.5 && angle < 67.5) return [Vicinity.NORTHEAST, distance];
    if (angle >= 67.5 && angle < 112.5) return [Vicinity.EAST, distance];
    if (angle >= 112.5 && angle < 157.5) return [Vicinity.SOUTHEAST, distance];
    if (angle >= 157.5 && angle < 202.5) return [Vicinity.SOUTH, distance];
    if (angle >= 202.5 && angle < 247.5) return [Vicinity.SOUTHWEST, distance];
    if (angle >= 247.5 && angle < 292.5) return [Vicinity.WEST, distance];
    if (angle >= 292.5 && angle < 337.5) return [Vicinity.NORTHWEST, distance];
    
    return [Vicinity.NORTH, distance]; // Default fallback
  }
  
  // Check if a block is visible
  private isBlockVisible(block: PBlock): boolean {
    // Check if surrounding blocks are full blocks
    let visibleSides = 0;
    for (const offset of NEARBY_BLOCK_VIS_OFFSETS) {
      const offblock = this.bot.blockAt(block.position.plus(offset));
      if (offblock === null) {
        visibleSides++; // If there's no block, this side is visible
        continue;
      }
      
      // Check if the block shape is a full block
      let isFullBlock = false;
      for (const shape of offblock.shapes) {
        const fullX = shape[0] === 0 && shape[3] === 1;
        const fullY = shape[1] === 0 && shape[4] === 1;
        const fullZ = shape[2] === 0 && shape[5] === 1;
        if (fullX && fullY && fullZ) {
          isFullBlock = true;
          break;
        }
      }
      
      if (!isFullBlock) {
        visibleSides++;
      }
    }
    
    if (visibleSides === 0) return false; // Block is visible if at least one side is visible

    return this.bot.canSeeBlock(block);
  }

  private *getAllBlocks(blockRadius: number) {
    // iterate over chunks
    const botPos = this.bot.entity.position;
    for (const {chunkX, chunkZ, column} of this.bot.world.getColumns() as PCChunkCoordinateAndColumn[]) {
      if (!column) continue;

      // check if (any) of chunk is within radius
      // do so by calculating distance of each corner of chunk to bot
      // x0, y0, z0, x1, y1, z1
      const bb = new AABB(
        chunkX << 4, (this.bot.game as any).minY, chunkZ << 4,
        chunkX << 4 + 16, (this.bot.game as any).height, chunkZ << 4 + 16
      )

      if (bb.distanceToVec(botPos) > blockRadius) continue;

      const cursor = new Vec3(0, 0, 0);
      for (cursor.y = (this.bot.game as any).height; cursor.y >= (this.bot.game as any).minY; cursor.y--) {
        for (cursor.x = 0; cursor.x < 16; cursor.x++) {
          for (cursor.z = 0; cursor.z < 16; cursor.z++) {
            const pos = new Vec3(chunkX << 4 + cursor.x, cursor.y, chunkZ << 4 + cursor.z);
            if (pos.distanceTo(botPos) > blockRadius) continue;
            const block = column.getBlock(cursor);
            block.position = pos
            yield {block, column};
          }
        }
      }
    }
  }
  
  private observeSurroundings(): void {
    const immediateResult = new ImmediateSurroundings();
    const distantResult: DistantSurroundings = new Map();
    
    // Initialize distant surroundings for each direction
    Object.values(Direction).forEach(dir => {
      distantResult.set(dir as Direction, new DistantSurroundingsInADirection());
    });
    
    // Track closest biome distances for each direction
    const closestBiomeDistances: Map<Direction, Map<number, number>> = new Map();
    Object.values(Direction).forEach(dir => {
      closestBiomeDistances.set(dir as Direction, new Map());
    });
    
    // Get all blocks within distantRadius
    const botPos = this.bot.entity.position;
 
    
    // Process all blocks
    for (const {block, column} of this.getAllBlocks(this.distantRadius)) {
      
      // Skip blocks that are not visible
      if (!this.isBlockVisible(block)) continue;
      
      const [vicinity, distance] = this.getVicinityAndDistance(block.position);
      if (!vicinity) continue; // Block is too far
      

      // shift blockPos into column pos
      const colPos = new Vec3(block.position.x & 0xF, block.position.y, block.position.z & 0xF);
      const biome = column ? column.getBiome(colPos) as number : -1;
      
      if (vicinity === Vicinity.IMMEDIATE) {
        // Add to immediate surroundings
        if (!immediateResult.blocks!.has(block.name)) {
          immediateResult.blocks!.set(block.name, []);
        }
        immediateResult.blocks!.get(block.name)!.push(block.position);
        
        // Add biome
        if (biome !== -1) {
          immediateResult.biomes!.add(biome as number);
        }
      } else {
        // Add to distant surroundings in the correct direction
        const direction = this.getFacingDirection();
        const directionData = distantResult.get(direction)!;
        
        // Update blocks count
        const currentCount = directionData.blocks!.get(block.name) || 0;
        directionData.blocks!.set(block.name, currentCount + 1);
        
        // Update biome if it's the closest for this direction
        if (biome !== -1) {
          const currentBiomeDistance = closestBiomeDistances.get(direction)!.get(biome) || Infinity;
          if (distance < currentBiomeDistance) {
            closestBiomeDistances.get(direction)!.set(biome, distance);
            directionData.biomes!.set(biome, block.position);
          }
        }
      }
    }
    
    // Process entities
    for (const [id, entity] of Object.entries(this.bot.entities)) {
      if (entity.id === this.bot.entity.id) continue; // Skip self
      
      const distance = entity.position.distanceTo(botPos);
      if (distance > this.distantRadius) continue; // Skip if too far
      
      const [vicinity, _] = this.getVicinityAndDistance(entity.position);
      if (!vicinity) continue; // Entity is too far
      
      if (vicinity === Vicinity.IMMEDIATE) {
        // Add to immediate surroundings
        immediateResult.entities!.push(entity);
      } else {
        // Add to distant surroundings in the correct direction
        const direction = vicinity as unknown as Direction;
        const directionData = distantResult.get(direction)!;
        
        // Categorize entity
        if (entity.type === 'mob') {
          directionData.mobs!.push(entity);
        } else if (entity.type === 'player') {
          directionData.players!.push(entity);
        } else if (entity.type === 'object') {
          directionData.itemEntities!.push(entity);
        }
      }
    }
    
    // Process block entities
    for (const dir of Object.values(Direction)) {
      const direction = dir as Direction;
      const directionData = distantResult.get(direction)!;
      
      // Get chunks in this direction
      const chunks = this.getChunksInDirection(direction);
      for (const { column } of chunks) {
        // Access block entities if they exist in this version
        if (column && (column as any).blockEntities) {
          for (const [posStr, entity] of Object.entries((column as any).blockEntities)) {
            directionData.blockEntities!.set(posStr, entity);
          }
        }
      }
    }
    
    // Save the results
    this.lastObservedImmediateSurroundings = immediateResult;
    this.lastObservedDistantSurroundings = distantResult;
    this.timeOfLastObservation = new Date();
  }
  
  // Helper to get chunks in a specific direction
  private getChunksInDirection(direction: Direction): PCChunkCoordinateAndColumn[] {
    const chunks = this.bot.world.getColumns() as PCChunkCoordinateAndColumn[];
    const botPos = this.bot.entity.position;
    
    return chunks.filter(({ chunkX, chunkZ }) => {
      const blockChunkX = chunkX << 4;
      const blockChunkZ = chunkZ << 4;
      
      // Ensure chunk is within the defined radius
      if (Math.abs(blockChunkX - botPos.x) > this.distantRadius || 
          Math.abs(blockChunkZ - botPos.z) > this.distantRadius) {
        return false;
      }
      
      // Skip UP and DOWN directions for chunks
      if (direction === Direction.UP || direction === Direction.DOWN) {
        return false;
      }
      
      // Ensure chunk is within the defined direction
      const chunkCenter = new Vec3(blockChunkX + 8, 0, blockChunkZ + 8);
      return offsetIsWithinDirection(chunkCenter, botPos, direction);
    });
  }
  
  // Public methods
  public getImmediateSurroundings(throttleSeconds?: number): ImmediateSurroundings {
    if (!throttleSeconds || 
        (new Date().getTime() - this.timeOfLastObservation.getTime()) > throttleSeconds * 1000) {
      this.observeSurroundings();
    }
    return this.lastObservedImmediateSurroundings!;
  }
  
  public getDistantSurroundings(throttleSeconds?: number): DistantSurroundings {
    if (!throttleSeconds || 
        (new Date().getTime() - this.timeOfLastObservation.getTime()) > throttleSeconds * 1000) {
      this.observeSurroundings();
    }
    return this.lastObservedDistantSurroundings!;
  }
  
  public getSurroundings(throttleSeconds?: number): [ImmediateSurroundings, DistantSurroundings] {
    if (!throttleSeconds || 
        (new Date().getTime() - this.timeOfLastObservation.getTime()) > throttleSeconds * 1000) {
      this.observeSurroundings();
    }
    return [this.lastObservedImmediateSurroundings!, this.lastObservedDistantSurroundings!];
  }
  
  // Utility methods similar to the previous implementation
  public getFacingDirection(): Direction {
    let yaw = (Math.PI - this.bot.entity.yaw) * (180 / Math.PI);
    return findDir(yaw);
  }
  
  public toString(): string {
    return JSON.stringify({
      immediateData: this.lastObservedImmediateSurroundings,
      distantData: Array.from(this.lastObservedDistantSurroundings?.entries() || [])
    }, (key, value) => {
      // Convert maps to objects for JSON
      if (value instanceof Map) {
        return Object.fromEntries(value);
      } else if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }, 2);
  }
}

// Semantic World class (similar to previous implementation but updated to use new Surroundings)
export class SemanticWorld {
  private notepad: Map<string, any> = new Map<string, any>();
  private bot: Bot;
  public surroundings: Surroundings;
  
  constructor(bot: Bot, opts: SemanticOptions) {
    this.bot = bot;
    this.surroundings = new Surroundings(bot, opts);
  }
  
  // Getters for player state
  public get coordinates(): Vec3 {
    return this.bot.entity.position;
  }
  
  public get health(): number {
    return this.bot.health;
  }
  
  public get hunger(): number {
    return this.bot.food;
  }
  
  public get timeOfDay(): number {
    return this.bot.time.timeOfDay;
  }
  
  public get biome(): number {
    const currentColumn = this.bot.world.getColumnAt(this.bot.entity.position);
    return currentColumn.getBiome(this.bot.entity.position) as number;
  }
  
  public get inventory(): PItem[] {
    return this.bot.inventory.slots.filter((item) => item !== null) as unknown as PItem[];
  }
  
  public get equipped(): PItem[] {
    return this.bot.entity.equipment.filter((item) => item !== null) as unknown as PItem[];
  }
  
  // Notepad methods
  public setNote(key: string, value: any): void {
    this.notepad.set(key, value);
  }
  
  public delNote(key: string): void {
    this.notepad.delete(key);
  }
  
  public getNotepad(): Map<string, any> {
    return this.notepad;
  }
  
  // String representation
  public toString(): string {
    return JSON.stringify({
      coordinates: this.coordinates,
      health: this.health,
      hunger: this.hunger,
      timeOfDay: this.timeOfDay,
      inventory: this.inventory,
      equipped: this.equipped,
      notepad: Object.fromEntries(this.notepad),
      surroundings: this.surroundings.toString()
    }, null, 2);
  }
}
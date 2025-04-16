import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block } from "prismarine-block";
import { Entity } from "prismarine-entity";
import { Direction, Vicinity, SurroundingsRadii, _Surroundings, ImmediateSurroundings, DistantSurroundingsInADirection } from "./types";

import type {Item as PItem} from 'prismarine-item'
export const BOT_EYE_HEIGHT = 1.62;
export const BLOCKS_TO_IGNORE = ["air"];

export class SurroundingsHydrater {
  private bot: Bot;
  private radii: SurroundingsRadii;
  private surroundings: _Surroundings;
  
  // Cache maps for fast lookups
  private blockLookup: Map<string, { name: string, vicinity: Vicinity }> = new Map();
  private entityLookup: Map<number, { name: string, vicinity: Vicinity }> = new Map();
  
  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = {
      immediateSurroundingsRadius: radii.immediateSurroundingsRadius,
      distantSurroundingsRadius: radii.distantSurroundingsRadius
    };
    this.surroundings = new _Surroundings(bot, this.radii);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Process chunk loads
    this.bot.world.on('chunkColumnLoad', (point) => {
      this.processChunk(point.x >> 4, point.z >> 4);
    });
    
    // Handle block updates
    this.bot.on('blockUpdate', (oldBlock, newBlock) => {
      if (newBlock) {
        this.updateBlock(newBlock);
      } else if (oldBlock) {
        this.removeBlock(oldBlock.position);
      }
    });
    
    // Handle item entity spawns
    this.bot.on('entitySpawn', (entity) => {
      if (entity.name === 'item') {
        this.processItemEntity(entity);
      }
    });
    
    // Handle item entity movements
    this.bot.on('entityMoved', (entity) => {
      if (entity.name === 'item' && this.entityLookup.has(entity.id)) {
        this.updateItemEntity(entity);
      }
    });
    
    // Handle item entity removals
    this.bot.on('entityGone', (entity) => {
      if (entity.name === 'item' && this.entityLookup.has(entity.id)) {
        this.removeItemEntity(entity.id);
      }
    });
    
    // Recalculate when bot moves
    this.bot.on('move', () => {
      this.recalculateVicinities();
    });

    // for (const {chunkX, chunkZ} of this.bot.world.getColumns()) {
    //   this.processChunk(chunkX >> 4, chunkZ >> 4);
    // }
  }
  
  private getBlockKey(pos: Vec3): string {
    return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
  }
  
  private getVicinityForPosition(pos: Vec3): Vicinity {
    const botPos = this.bot.entity.position;
    const distance = botPos.distanceTo(pos);
    
    // Check if within immediate surroundings
    if (distance <= this.radii.immediateSurroundingsRadius) {
      return Vicinity.IMMEDIATE_SURROUNDINGS;
    }
    
    // Check if outside of distant surroundings
    if (distance > this.radii.distantSurroundingsRadius) {
      return Vicinity.IMMEDIATE_SURROUNDINGS; // Default fallback, will be filtered later
    }
    
    // Check for up/down columns
    const horizontalDist = Math.sqrt(
      Math.pow(pos.x - botPos.x, 2) + 
      Math.pow(pos.z - botPos.z, 2)
    );
    
    if (horizontalDist <= this.radii.immediateSurroundingsRadius) {
      return pos.y > botPos.y ? Vicinity.DISTANT_SURROUNDINGS_UP : Vicinity.DISTANT_SURROUNDINGS_DOWN;
    }
    
    // Determine direction based on angle
    const angle = (Math.atan2(pos.x - botPos.x, botPos.z - pos.z) * 180 / Math.PI + 360) % 360;
    
    if (angle < 22.5 || angle >= 337.5) return Vicinity.DISTANT_SURROUNDINGS_NORTH;
    if (angle < 67.5) return Vicinity.DISTANT_SURROUNDINGS_NORTHEAST;
    if (angle < 112.5) return Vicinity.DISTANT_SURROUNDINGS_EAST;
    if (angle < 157.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTHEAST;
    if (angle < 202.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTH;
    if (angle < 247.5) return Vicinity.DISTANT_SURROUNDINGS_SOUTHWEST;
    if (angle < 292.5) return Vicinity.DISTANT_SURROUNDINGS_WEST;
    return Vicinity.DISTANT_SURROUNDINGS_NORTHWEST;
  }
  
  private processChunk(chunkX: number, chunkZ: number): void {
    const column = this.bot.world.getColumn(chunkX, chunkZ);
    if (!column) return;
    
    const botPos = this.bot.entity.position;
    const maxDistance = this.radii.distantSurroundingsRadius;
    
    // Quick check if chunk is completely out of range
    const chunkCornerX = chunkX << 4;
    const chunkCornerZ = chunkZ << 4;
    const closestX = Math.max(chunkCornerX, Math.min(botPos.x, chunkCornerX + 15));
    const closestZ = Math.max(chunkCornerZ, Math.min(botPos.z, chunkCornerZ + 15));
    const minDist = Math.sqrt(Math.pow(closestX - botPos.x, 2) + Math.pow(closestZ - botPos.z, 2));
    
    if (minDist > maxDistance + this.radii.distantSurroundingsRadius) return; // Skip chunk if even the closest point is too far
    
    // Process blocks in the chunk
    const minY = (this.bot.game as any).minY ?? 0;
    const maxY = ((this.bot.game as any).height ?? 256);
    
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const worldX = (chunkX << 4) + x;
        const worldZ = (chunkZ << 4) + z;
        
        // Check if this column is within range
        const horizontalDist = Math.sqrt(Math.pow(worldX - botPos.x, 2) + Math.pow(worldZ - botPos.z, 2));
        if (horizontalDist > maxDistance + 1) continue;
        
        for (let y = minY; y < maxY; y++) {
          const pos = new Vec3(worldX, y, worldZ);
          const block = this.bot.blockAt(pos);
          
          if (block && !BLOCKS_TO_IGNORE.includes(block.name)) {
            this.updateBlock(block);
          }
        }
      }
    }
  }
  
  private updateBlock(block: Block): void {
    const pos = block.position;
    const blockKey = this.getBlockKey(pos);
    
    // Skip if block should be ignored
    if (BLOCKS_TO_IGNORE.includes(block.name)) {
      this.removeBlock(pos);
      return;
    }
    
    // Check if within range
    const botPos = this.bot.entity.position;
    const distance = botPos.distanceTo(pos);
    if (distance > this.radii.distantSurroundingsRadius) {
      this.removeBlock(pos);
      return;
    }
    
    // Determine vicinity
    const vicinity = this.getVicinityForPosition(pos);
    
    // Remove old entry if it exists and vicinity changed
    const existingData = this.blockLookup.get(blockKey);
    if (existingData && existingData.vicinity !== vicinity) {
      this.removeBlockFromVicinity(existingData.name, pos, existingData.vicinity);
    }


    // Add to appropriate vicinity
    this.addBlockToVicinity(block, vicinity);
    
    // Update lookup map
    this.blockLookup.set(blockKey, {
      name: block.name,
      vicinity: vicinity
    });
  }
  
  private removeBlock(pos: Vec3): void {
    const blockKey = this.getBlockKey(pos);
    const blockData = this.blockLookup.get(blockKey);
    
    if (blockData) {
      this.removeBlockFromVicinity(blockData.name, pos, blockData.vicinity);
      this.blockLookup.delete(blockKey);
    }
  }
  
  private addBlockToVicinity(block: Block, vicinity: Vicinity): void {
    const pos = block.position;
    
    if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      // Add to immediate surroundings
      if (!this.surroundings.immediate.blocksToAllCoords.has(block.name)) {
        this.surroundings.immediate.blocksToAllCoords.set(block.name, []);
      }
      this.surroundings.immediate.blocksToAllCoords.get(block.name)!.push(pos.clone());
      
      // Add biome if available
      if (block.biome && block.biome.id !== undefined && block.biome.id !== -1) {
        this.surroundings.immediate.biomes.add(block.biome.id);
      }
    } else {
      // Get direction from vicinity
      const direction = vicinity as unknown as Direction;
      const distantDir = this.surroundings.distant.get(direction)!;
      
      // Add to block counts
      distantDir.blocksToCounts.set(
        block.name,
        (distantDir.blocksToCounts.get(block.name) || 0) + 1
      );
      
      // Update closest block
      const botPos = this.bot.entity.position;
      const distance = botPos.distanceTo(pos);
      const currentClosest = distantDir.blocksToClosestCoords.get(block.name);
      
      if (!currentClosest || botPos.distanceTo(currentClosest) > distance) {
        distantDir.blocksToClosestCoords.set(block.name, pos.clone());
      }
      
      // Add biome if available
      if (block.biome && block.biome.id !== undefined && block.biome.id !== -1) {
        const currentBiome = distantDir.biomesToClosestCoords.get(block.biome.id);
        
        if (!currentBiome || botPos.distanceTo(currentBiome) > distance) {
          distantDir.biomesToClosestCoords.set(block.biome.id, pos.clone());
        }
      }
    }
  }
  
  private removeBlockFromVicinity(blockName: string, pos: Vec3, vicinity: Vicinity): void {
    if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      const blocks = this.surroundings.immediate.blocksToAllCoords.get(blockName);
      if (blocks) {
        const newBlocks = blocks!.filter(coord => !coord.equals(pos));
        if (newBlocks.length > 0) {
          this.surroundings.immediate.blocksToAllCoords.set(blockName, newBlocks);
        } else {
          this.surroundings.immediate.blocksToAllCoords.delete(blockName);
        }
      }
    } else {
      const direction = vicinity as unknown as Direction;
      const distantDir = this.surroundings.distant.get(direction)!;
      
      // Decrease count
      const count = distantDir.blocksToCounts.get(blockName) || 0;
      if (count > 1) {
        distantDir.blocksToCounts.set(blockName, count - 1);
      } else {
        distantDir.blocksToCounts.delete(blockName);
        distantDir.blocksToClosestCoords.delete(blockName);
      }
      
      // If this was the closest block, we need to find a new closest one
      const closestPos = distantDir.blocksToClosestCoords.get(blockName);
      if (closestPos && closestPos!.equals(pos)) {
        distantDir.blocksToClosestCoords.delete(blockName);
      }
    }
  }
  
  private async processItemEntity(entity: Entity): Promise<void> {
    // await entityUpdate 

    await new Promise<void>((res, rej) => {
      const listener = (e: Entity) => {
        if (e.id === entity.id) {
          res();
          this.bot.off('entityUpdate', listener);
        }
      }
      this.bot.on('entityUpdate', listener);
      setTimeout(() => {
        rej(new Error('Timeout waiting for entity update'));
        this.bot.off('entityUpdate', listener);
      }, 5000);
    });

    let item: PItem | null;
    try {
      item = entity.getDroppedItem();
      if (!item) return;
    } catch (err) {
      return;
    }

    
    const pos = entity.position;
    
    // Check if within range
    const distance = this.bot.entity.position.distanceTo(pos);
    if (distance > this.radii.distantSurroundingsRadius) return;
    
    // Determine vicinity
    const vicinity = this.getVicinityForPosition(pos);
    
    // Add to appropriate vicinity
    this.addItemToVicinity(item.name, pos, vicinity, entity.id);
    
    // Update lookup map
    this.entityLookup.set(entity.id, {
      name: item.name,
      vicinity: vicinity
    });
  }
  
  private updateItemEntity(entity: Entity): void {
    const entityData = this.entityLookup.get(entity.id);
    if (!entityData) return;
    
    const item = entity.getDroppedItem();
    if (!item) return;
    
    const pos = entity.position;
    
    // Check if within range
    const distance = this.bot.entity.position.distanceTo(pos);
    if (distance > this.radii.distantSurroundingsRadius) {
      this.removeItemEntity(entity.id);
      return;
    }
    
    // Determine new vicinity
    const newVicinity = this.getVicinityForPosition(pos);
    
    // we would normally not update if the position is the same, but we don't track that currently.
    this.removeItemFromVicinity(entityData.name, entity.id, entityData.vicinity);
    
    // Add to new vicinity
    this.addItemToVicinity(item.name, pos, newVicinity, entity.id);
    
    // Update lookup map
    entityData.vicinity = newVicinity;
  
  }
  
  private removeItemEntity(entityId: number): void {
    const entityData = this.entityLookup.get(entityId);
    if (!entityData) return;
    
    this.removeItemFromVicinity(entityData.name, entityId, entityData.vicinity);
    this.entityLookup.delete(entityId);
  }
  
  private addItemToVicinity(itemName: string, pos: Vec3, vicinity: Vicinity, entityId: number): void {
    if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      // Add to immediate surroundings
      if (!this.surroundings.immediate.itemEntitiesToAllCoords.has(itemName)) {
        this.surroundings.immediate.itemEntitiesToAllCoords.set(itemName, []);
      }
      this.surroundings.immediate.itemEntitiesToAllCoords.get(itemName)!.push(pos.clone());
    } else {
      // Get direction from vicinity
      const direction = vicinity as unknown as Direction;
      const distantDir = this.surroundings.distant.get(direction)!;
      
      // Add to item counts
      distantDir.itemEntitiesToCounts.set(
        itemName,
        (distantDir.itemEntitiesToCounts.get(itemName) || 0) + 1
      );
      
      // Update closest item
      const botPos = this.bot.entity.position;
      const distance = botPos.distanceTo(pos);
      const currentClosest = distantDir.itemEntitiesToClosestCoords.get(itemName);
      
      if (!currentClosest || botPos.distanceTo(currentClosest) > distance) {
        distantDir.itemEntitiesToClosestCoords.set(itemName, pos.clone());
      }
    }
  }
  
  private removeItemFromVicinity(itemName: string, entityId: number, vicinity: Vicinity): void {
    return
    if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      const items = this.surroundings.immediate.itemEntitiesToAllCoords.get(itemName)!;
      if (items) {
        // For immediate vicinity, we need to find the item by its coordinates
        // This is a limitation since we don't store entity IDs
        // In a full implementation, we'd want to track entity IDs for immediate vicinity too
        const newItems = items.filter((_, idx) => idx !== items.length - 1); // Remove last one as approximation
        
        if (newItems.length > 0) {
          this.surroundings.immediate.itemEntitiesToAllCoords.set(itemName, newItems);
        } else {
          this.surroundings.immediate.itemEntitiesToAllCoords.delete(itemName);
        }
      }
    } else {
      const direction = vicinity as unknown as Direction;
      const distantDir = this.surroundings.distant.get(direction)!;
      
      // Decrease count
      const count = distantDir.itemEntitiesToCounts.get(itemName) || 0;
      if (count > 1) {
        distantDir.itemEntitiesToCounts.set(itemName, count - 1);
      } else {
        distantDir.itemEntitiesToCounts.delete(itemName);
        distantDir.itemEntitiesToClosestCoords.delete(itemName);
      }
    }
  }
  
  private recalculateVicinities(): void {
    // Recalculate blocks
    for (const [blockKey, data] of this.blockLookup.entries()) {
      const [x, y, z] = blockKey.split(',').map(Number);
      const pos = new Vec3(x, y, z);
      
      // Check if still in range
      const distance = this.bot.entity.position.distanceTo(pos);
      if (distance > this.radii.distantSurroundingsRadius) {
        this.removeBlock(pos);
        continue;
      }
      
      // Determine new vicinity
      const newVicinity = this.getVicinityForPosition(pos);
      
      // If vicinity changed, update
      // if (newVicinity !== data.vicinity) {
        const block = this.bot.blockAt(pos)!;
        if (block && !BLOCKS_TO_IGNORE.includes(block.name)) {
          this.removeBlockFromVicinity(data.name, pos, data.vicinity);
          this.addBlockToVicinity(block, newVicinity);
          data.vicinity = newVicinity;
        } else {
          this.removeBlock(pos);
        }
      // }
    }
    
    // Recalculate items
    for (const [entityId, data] of this.entityLookup.entries()) {
      const entity = this.bot.entities[entityId];
      if (!entity) {
        this.removeItemEntity(entityId);
        continue;
      }
      
      // Check if still in range
      const distance = this.bot.entity.position.distanceTo(entity.position);
      if (distance > this.radii.distantSurroundingsRadius) {
        this.removeItemEntity(entityId);
        continue;
      }
      
      // Determine new vicinity
      const newVicinity = this.getVicinityForPosition(entity.position);
      
      // If vicinity changed, update
      // if (newVicinity !== data.vicinity) {
        const item = entity.getDroppedItem()!;
        if (item) {
          this.removeItemFromVicinity(data.name, entityId, data.vicinity);
          this.addItemToVicinity(item.name, entity.position, newVicinity, entityId);
          data.vicinity = newVicinity;
        } else {
          this.removeItemEntity(entityId);
        }
      // }
    }
  }
  
  // Public method to get the current surroundings
  public getHydration(): _Surroundings {
    return this.surroundings;
  }
}
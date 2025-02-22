import { Bot, FindBlockOptions } from "mineflayer";
import { Vec3 } from "vec3";
import type { Item as PItem } from "prismarine-item";
import { world } from "prismarine-world";
import { PCChunk } from "prismarine-chunk";

import { AABB } from "@nxg-org/mineflayer-util-plugin";

import type { Block as PBlock } from "prismarine-block";
import { DIRECTION_ANGLES, Direction, findDir } from "../constants";
import { ImmediateSurroundingsConfig, NearbySurroundingsConfig, PCChunkCoordinateAndColumn } from "./types";
import { Entity } from "prismarine-entity";
import { SemanticOptions } from "../types";
import { offsetIsWithinDirection } from "./utils";


export class ImmediateSurroundings {
  private _radius: number;

  public constructor(private bot: Bot, options: ImmediateSurroundingsConfig) {
    this._radius = options.radius;
  }

  // format to this: Optional[dict[str, list[tuple[int, int, int]]]]
  public get blocks(): Map<string, Vec3[]> {
    const blockPos = this.bot.findBlocks({
      matching: (block) => true,
      maxDistance: this._radius,
    });

    const blocks: PBlock[] = [];
    for (const bPos of blockPos) {
      const block = this.bot.blockAt(bPos);

      // this should never happen due to previous condiditon always returning valid blocks
      if (block === null) continue;
      blocks.push(block);
    }
    const blockMap = new Map<string, Vec3[]>();
    for (const block of blocks) {
      const key = block.name;
      if (blockMap.has(key)) {
        blockMap.get(key)?.push(block.position);
      } else {
        blockMap.set(key, [block.position]);
      }
    }

    return blockMap;
  }

  public get entities(): Entity[] {
    const entities = [];
    for (const [id, entity] of Object.entries(this.bot.entities)) {
      if (entity.id === this.bot.entity.id) continue;
      if (entity.position.distanceTo(this.bot.entity.position) > this._radius) continue;
      entities.push(entity);
    }
    return entities;
  }
}

const NEARBY_BLOCK_VIS_OFFSETS: Vec3[] = [
  new Vec3(1, 0, 0),
  new Vec3(-1, 0, 0),
  new Vec3(0, 1, 0),
  new Vec3(0, -1, 0),
  new Vec3(0, 0, 1),
  new Vec3(0, 0, -1), // just orthogonal directions
];

export class NearbySurroundings {
  private _blockRadius: number;

  public constructor(private bot: Bot, options: NearbySurroundingsConfig) {
    this._blockRadius = options.blockRadius;
  }

  getRadiusChunks(targetDirection: Direction, distance = this._blockRadius): PCChunkCoordinateAndColumn[] {
    const chunks = this.bot.world.getColumns();
    const currentPos = this.bot.entity.position;

    return chunks
      .filter(({ chunkX, chunkZ }) => {
        const blockChunkX = chunkX << 4;
        const blockChunkZ = chunkZ << 4;

        // Ensure chunk is within the defined radius
        if (Math.abs(blockChunkX - currentPos.x) > distance || Math.abs(blockChunkZ - currentPos.z) > distance)
          return false;

        // Ensure chunk is within the defined direction
        const chunkCenter = new Vec3(blockChunkX + 8, 0, blockChunkZ + 8);
        return offsetIsWithinDirection(chunkCenter, currentPos, targetDirection);
      })
      .map(({ chunkX, chunkZ, column }) => ({ chunkX, chunkZ, column: column as PCChunk }));
  }

  public biomes(direction: Direction, distance = this._blockRadius): Set<number> {
    const biomes = new Set<number>();
    for (const { chunkX, chunkZ, column } of this.getRadiusChunks(direction, distance)) {
      // iterate over blocks in chunk
      // console.log((column as any).biomes, Object.keys(column))

      // loop down from max to min height
      const cursor = new Vec3(0, 0, 0)
      for (cursor.y = (this.bot.game as any).height; cursor.y >= (this.bot.game as any).minY; cursor.y--) {
        for (cursor.x = 0; cursor.x < 16; cursor.x++) {
          for (cursor.z = 0; cursor.z < 16; cursor.z++) {
            const biome = column.getBiome(cursor);
            biomes.add(biome);
          }
        }
      }
    }
    return biomes;
  }

  public blockEntities(direction: Direction): any[] {
    // pull from chunk data instead of bot
    const blockEntities = [];

    for (const { chunkX, chunkZ, column } of this.getRadiusChunks(direction)) {
      // we are assuming java edition chunks here. should be fine.

      // NOTE: this is here because older versions did not store blockEntities in this manner.
      // In fact, I do not know the exact way they were stored.
      if (column.hasOwnProperty("blockEntities")) {
        blockEntities.push(...(column as any).blockEntities); // TODO: this may not be what I want.
      }
    }
    return blockEntities;
  }

  public mobs(dir: Direction): Entity[] {
    const entities = [];
    const curPos = this.bot.entity.position;
    for (const [id, entity] of Object.entries(this.bot.entities)) {
      if (entity.type !== "mob") continue;
      if (entity.position.distanceTo(curPos) > this._blockRadius) {
        continue;
      }
      if (!offsetIsWithinDirection(entity.position, curPos, dir)) continue;

      entities.push(entity);
    }
    return entities;
  }

  public players(dir: Direction): Entity[] {
    const entities = [];
    const curPos = this.bot.entity.position;
    for (const [id, entity] of Object.entries(this.bot.entities)) {
      if (entity.id === this.bot.entity.id) continue;
      if (entity.type !== "player") continue;
      if (entity.position.distanceTo(curPos) > this._blockRadius) {
        continue;
      }
      if (!offsetIsWithinDirection(entity.position, curPos, dir)) continue;

      entities.push(entity);
    }
    return entities;
  }

  public itemEntities(dir: Direction) {
    const entities = [];
    const curPos = this.bot.entity.position;
    for (const [id, entity] of Object.entries(this.bot.entities)) {
      // TODO: item check on ground? Forgot exactly how to do this. I believe object also refers to arrows.
      if (entity.type !== "object") continue;
      if (entity.position.distanceTo(curPos) > this._blockRadius) {
        continue;
      }

      if (!offsetIsWithinDirection(entity.position, curPos, dir)) continue;
      entities.push(entity);
    }
    return entities;
  }
}

export class SemanticWorld {
  // TODO: add priorities for the notes?
  private _notepad: Map<string, any> = new Map<string, any>();

  // TODO: properly implement?
  public immediateSurroundings!: ImmediateSurroundings;

  // TODO: properly implement?
  public nearbySurroundings!: NearbySurroundings;

  public constructor(private readonly bot: Bot, opts: SemanticOptions) {
    this.immediateSurroundings = new ImmediateSurroundings(bot, { radius: opts.immediateRadius });
    this.nearbySurroundings = new NearbySurroundings(bot, { blockRadius: opts.nearbyRadius });
  }

  public get coordinates(): Vec3 {
    return this.bot.entity.position;
  }

  public get health(): number {
    return this.bot.health; // TODO: inaccurate for metadata specific health (golden apples, etc.)
  }

  public get hunger(): number {
    return this.bot.food; // TODO: pretty sure this is slightly inaccurate
  }

  public get timeOfDay(): number {
    return this.bot.time.age;
  }

  public get inventory(): PItem[] {
    return this.bot.inventory.slots.filter((item) => item !== null) as unknown as PItem[];
  }

  public get equipped(): PItem[] {
    return this.bot.entity.equipment.filter((item) => item !== null) as unknown as PItem[];
  }

  // technically this does nothing as the map is editable from the outside.
  public get notepad(): Map<string, any> {
    return this._notepad;
  }

  public setNote = (key: string, value: any): void => {
    this._notepad.set(key, value);
  };

  public delNote = (key: string): void => {
    this._notepad.delete(key);
  };

  /**
   * @override
   */
  public toString() {
    return `{
      coordinates: ${this.coordinates},
      health: ${this.health},
      hunger: ${this.hunger},
      timeOfDay: ${this.timeOfDay},
      inventory: ${JSON.stringify(this.inventory, null, 2)},
      equipped: ${JSON.stringify(this.equipped, null, 2)},
      notepad: ${JSON.stringify(this.notepad, null, 2)}
    }`;
  }

  // ========================
  // Utility functions
  // ========================

  public getFacingDirection(): Direction {
    // base this off of bot's yaw
    let yaw = (Math.PI - this.bot.entity.yaw) * (180 / Math.PI);

    return findDir(yaw);
  }

  public findBlocks(dir: Direction, search: FindBlockOptions): PBlock[] {
    const search1: FindBlockOptions = { ...search, count: Infinity };
    const blocks = this.bot.findBlocks(search1);
    const curPos = this.bot.entity.position;
    return blocks
      .filter((block) => {
        return offsetIsWithinDirection(block, curPos, dir);
      })
      .map((block) => this.bot.world.getBlock(block)!);
  }

  // NAIVE CHECK
  public isBlockVisible(blockPos: Vec3, raycast = false) {
    // check if block shapes are full blocks, if so return false.
    let failures = 0;
    for (const offset of NEARBY_BLOCK_VIS_OFFSETS) {
      const block = this.bot.blockAt(blockPos.plus(offset));
      if (block === null) return false;

      // this will only flag a failure for blocks w/ one shape, or full blocks.
      // stairs will not flag this check.
      for (const shape of block.shapes) {
        const fullX = shape[0] === 0 && shape[3] === 1;
        const fullY = shape[1] === 0 && shape[4] === 1;
        const fullZ = shape[2] === 0 && shape[5] === 1;
        if (fullX && fullY && fullZ) failures++;
      }
    }
    // all blocks have a full shape.
    if (failures === NEARBY_BLOCK_VIS_OFFSETS.length) return false;
    if (!raycast) return true;

    // TODO: this is not a fully accurate raycast check! to be sure, check multiple points on the block!
    const block = this.bot.world.getBlock(blockPos);
    if (block === null) return false; // should never happen.

    // TODO: this is not accurate! Mineflayer does not correctly update pose.
    // TODO: This also does not handle entity intersection!
    return this.bot.canSeeBlock(block);
  }
}

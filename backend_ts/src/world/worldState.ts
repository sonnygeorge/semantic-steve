import { Bot, FindBlockOptions } from "mineflayer";
import { Vec3 } from "vec3";
import type { Item as PItem } from "prismarine-item";
import { world } from "prismarine-world";
import { PCChunk } from "prismarine-chunk";

import { AABB } from "@nxg-org/mineflayer-util-plugin";

import type { Block as PBlock } from "prismarine-block";
import { DIRECTION_ANGLES, Direction } from "../constants";
import { ImmediateSurroundingsConfig, NearbySurroundingsConfig, PCChunkCoordinateAndColumn } from "./types";
import { Entity } from "prismarine-entity";

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

  public getFacingDirection(): Direction {
    // base this off of bot's yaw
    let yaw = (Math.PI - this.bot.entity.yaw) * (180 / Math.PI);

    console.log(yaw);

    for (const [dir, [min, max]] of Object.entries(DIRECTION_ANGLES)) {
      if (min < max) {
        // Normal case (min to max is continuous)
        if (yaw >= min && yaw < max) return dir as Direction;
      } else {
        // Wrapping case (e.g., WEST spans from 157.5 to -157.5)
        if (yaw >= min || yaw < max) return dir as Direction;
      }
    }
    console.log("fuck?");
    return Direction.NORTH; // default to north
  }

  private offsetIsWithinDirection(target: Vec3, src: Vec3, direction: Direction): boolean {
    const [minAngle, maxAngle] = DIRECTION_ANGLES[direction];
    const dx = target.x - src.x;
    const dz = target.z - src.z;
    let angle = (Math.atan2(-dz, dx) * 180) / Math.PI; // Normalize to [0, 360]
    return minAngle <= angle && angle < maxAngle;
  }

  getRadiusChunks(targetDirection: Direction): PCChunkCoordinateAndColumn[] {
    const chunks = this.bot.world.getColumns();
    const currentPos = this.bot.entity.position;

    return chunks
      .filter(({ chunkX, chunkZ }) => {
        const blockChunkX = chunkX << 4;
        const blockChunkZ = chunkZ << 4;

        // Ensure chunk is within the defined radius
        if (Math.abs(blockChunkX - currentPos.x) > this._blockRadius || Math.abs(blockChunkZ - currentPos.z) > this._blockRadius)
          return false;

        // Ensure chunk is within the defined direction
        const chunkCenter = new Vec3(blockChunkX + 8, 0, blockChunkZ + 8);
        return this.offsetIsWithinDirection(chunkCenter, currentPos, targetDirection);
      })
      .map(({ chunkX, chunkZ, column }) => ({ chunkX, chunkZ, column: column as PCChunk }));
  }

  public biomes(direction: Direction): number[] {
    const biomes: number[] = [];
    for (const { chunkX, chunkZ, column } of this.getRadiusChunks(direction)) {
      // iterate over blocks in chunk
      biomes.push(...column.dumpBiomes());
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
      if (!this.offsetIsWithinDirection(entity.position, curPos, dir)) continue;

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
      if (!this.offsetIsWithinDirection(entity.position, curPos, dir)) continue;

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

      if (!this.offsetIsWithinDirection(entity.position, curPos, dir)) continue;
      entities.push(entity);
    }
    return entities;
  }

  public findBlocks(dir: Direction, search: FindBlockOptions): PBlock[] {
    const search1: FindBlockOptions = { ...search, maxDistance: Math.min(search.maxDistance ?? Infinity, this._blockRadius), count: Infinity };
    const blocks = this.bot.findBlocks(search1);
    const curPos = this.bot.entity.position;
    return blocks.filter((block) => {
      if (block.distanceTo(curPos) > this._blockRadius) return false;
      return this.offsetIsWithinDirection(block, curPos, dir);
    }).map((block) => this.bot.world.getBlock(block)!);
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

export class WorldState {
  // TODO: add priorities for the notes?
  private _notepad: Map<string, any> = new Map<string, any>();

  // TODO: properly implement?
  private immediateSurroundings!: ImmediateSurroundings;

  // TODO: properly implement?
  private nearbySurroundings!: NearbySurroundings;

  public constructor(private readonly bot: Bot) {}

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
  public toString() {}
}

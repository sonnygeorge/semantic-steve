import assert from "assert";
import * as fs from "fs";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import {
  SerializedVoxelOffset,
  SurroundingsRadii,
  VicinityName,
  DirectionName,
  ItemEntityWithData,
} from "../../types";
import { Block as PBlock } from "prismarine-block";
import { Entity as PEntity } from "prismarine-entity";
import { serializeVec3 } from "../../utils/generic";
import {
  DistantSurroundingsInADirectionDTO,
  ImmediateSurroundingsDTO,
} from "./dto";
import { getVicinitiesToDistanceSortedOffsets } from "./classify-vicinity";
import { getEyePos } from "../../utils/misc";
import { VisibilityRaycaster } from "./visibility-raycaster";
import { ThreeDimOrientation } from "../../utils/orientation";
import { OffsetBased3DArray } from "../../utils/array";
import { ensureItemData } from "../../utils/item-entity";

export class VicinitiesObserver {
  private bot: Bot;
  private visibilityRaycaster: VisibilityRaycaster;
  public radii: SurroundingsRadii;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public allSpawnedItemEntities: Map<string, ItemEntityWithData> = new Map<
    string,
    ItemEntityWithData
  >();
  public itemEntitiesGoneBeforeAdd: Set<string> = new Set();
  // Outer contexts can set this to something and wait for it to be set to back to null to
  // know that a cycle has completed. Lol, there's probably a better way to do this.
  public thisGetsSetToNullAtEndOfObservationCycle: null | any = null;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
    this.visibilityRaycaster = new VisibilityRaycaster(
      bot,
      this.radii.distantSurroundingsRadius
    );
    this.immediate = new ImmediateSurroundings(
      bot,
      VicinityName.IMMEDIATE_SURROUNDINGS,
      this
    );
    this.distant = new Map<DirectionName, DistantSurroundingsInADirection>(
      Object.values(DirectionName).map((direction) => [
        direction,
        new DistantSurroundingsInADirection(
          bot,
          direction as any as VicinityName,
          this
        ),
      ])
    );
  }

  public get visibleBlocks(): OffsetBased3DArray<PBlock | null> {
    return this.visibilityRaycaster.visibleBlocks;
  }

  public get visibilityMask(): OffsetBased3DArray<boolean> {
    return this.visibilityRaycaster.visibilityMask;
  }

  private async doObservationCycle(fromBotPos: Vec3): Promise<void> {
    const fromEyeVoxel = getEyePos(this.bot, fromBotPos).floor();
    const raycasts: Array<
      [
        {
          phi: number;
          theta: number;
          hit: null | { x: number; y: number; z: number };
        }
      ]
    > = [];
    for await (const [vecNorm, pBlock] of this.visibilityRaycaster.doRaycasting(
      fromEyeVoxel
    )) {
      if (!vecNorm) {
        // No more raycasts to process
        break;
      }
      const orientation = new ThreeDimOrientation(vecNorm);
      const { phi, theta } = orientation.sphericalAngles;
      let offset = null;
      if (pBlock) {
        offset = pBlock.position.minus(fromEyeVoxel);
      }
      raycasts.push([
        {
          phi,
          theta,
          hit: offset
            ? {
                x: offset.x,
                y: offset.y,
                z: offset.z,
              }
            : null,
        },
      ]);
    }
    fs.writeFileSync("raycasts.json", JSON.stringify(raycasts));

    this.thisGetsSetToNullAtEndOfObservationCycle = null;
  }

  public async beginObservation(): Promise<void> {
    // Do an initial complete observation cycle
    await this.doObservationCycle(this.bot.entity.position);
    // Setup listeners
    this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
    this.bot.on("move", this.handleBotMove.bind(this));
    // NOTE handling below is useless unless the itemEntityWithData.entity.position doesn't self-update(?)
    // this.bot.on("entityMoved", this.handleEntityMoved.bind(this));
  }

  public async handleBotMove(newBotPos: Vec3): Promise<void> {
    if (!this.visibilityRaycaster.isRaycasting) {
      await this.doObservationCycle(newBotPos);
    }
  }

  public handleBlockUpdate(
    oldBlock: PBlock | null,
    newBlock: PBlock | null
  ): void {
    if (oldBlock && newBlock) {
      assert(oldBlock.position.equals(newBlock.position));
    } // I think this is always true since falling (moving) blocks are considered 'entities'

    // TODO: Implement
  }
}

export class VisibleVicinityContents {
  private bot: Bot;
  private vicinity: Vicinity;

  constructor(bot: Bot, vicinity: Vicinity) {
    this.bot = bot;
    this.vicinity = vicinity;
  }

  public *getDistinctBlockNames(): Iterable<string> {
    const alreadyYielded = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      if (!alreadyYielded.has(block.name)) {
        yield block.name;
        alreadyYielded.add(block.name);
      }
    }
  }

  public getBlockNamesToAllCoords(): Map<string, Vec3[]> {
    const blockNamesToCoords: Map<string, Vec3[]> = new Map();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      if (!blockNamesToCoords.has(block.name)) {
        blockNamesToCoords.set(block.name, []);
      }
      blockNamesToCoords.get(block.name)!.push(block.position);
    }
    return blockNamesToCoords;
  }

  public getBlockNamesToClosestCoords(): Map<string, Vec3> {
    const blockNamesToClosestCoords: Map<string, Vec3> = new Map();
    const blockNamesToAllCoords = this.getBlockNamesToAllCoords();
    for (const [blockName, coords] of blockNamesToAllCoords.entries()) {
      if (coords.length > 0) {
        // Find the closest coordinate to the bot's position
        const closestCoord = coords.reduce((closest, current) => {
          return closest.distanceTo(this.bot.entity.position) <
            current.distanceTo(this.bot.entity.position)
            ? closest
            : current;
        });
        blockNamesToClosestCoords.set(blockName, closestCoord);
      }
    }
    return blockNamesToClosestCoords;
  }

  public getBlockNamesToCounts(): Map<string, number> {
    const blockNamesToCounts: Map<string, number> = new Map();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      if (!blockNamesToCounts.has(block.name)) {
        blockNamesToCounts.set(block.name, 0);
      }
      blockNamesToCounts.set(
        block.name,
        blockNamesToCounts.get(block.name)! + 1
      );
    }
    return blockNamesToCounts;
  }

  public *getDistinctBiomeNames(): Iterable<string> {
    const alreadyYielded: Set<string> = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!alreadyYielded.has(biomeName)) {
        yield biomeName;
        alreadyYielded.add(biomeName);
      }
    }
  }

  public getBiomeNamesToAllCoords(): Map<string, Vec3[]> {
    const biomeNamesToCoords: Map<string, Vec3[]> = new Map();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!biomeNamesToCoords.has(biomeName)) {
        biomeNamesToCoords.set(biomeName, []);
      }
      biomeNamesToCoords.get(biomeName)!.push(block.position);
    }
    return biomeNamesToCoords;
  }

  public getBiomeNamesToClosestCoords(): Map<string, Vec3> {
    const biomeNamesToClosestCoords: Map<string, Vec3> = new Map();
    const biomeNamesToAllCoords = this.getBiomeNamesToAllCoords();
    for (const [biomeName, coords] of biomeNamesToAllCoords.entries()) {
      if (coords.length > 0) {
        // Find the closest coordinate to the bot's position
        const closestCoord = coords.reduce((closest, current) => {
          return closest.distanceTo(this.bot.entity.position) <
            current.distanceTo(this.bot.entity.position)
            ? closest
            : current;
        });
        biomeNamesToClosestCoords.set(biomeName, closestCoord);
      }
    }
    return biomeNamesToClosestCoords;
  }

  public async *getDistinctItemNames(): AsyncIterable<string> {
    const alreadyYielded = new Set<string>();
    for (const entity of this.vicinity.iterVisibleEntities()) {
      console.log(entity.name);
      if (entity.name === "item") {
        // Ensure the loading of its uuid and PItem data
        const itemEntityWithData = await ensureItemData(this.bot, entity);
        if (!alreadyYielded.has(itemEntityWithData.itemData.name)) {
          yield itemEntityWithData.itemData.name;
          alreadyYielded.add(itemEntityWithData.itemData.name);
        }
      }
    }
  }

  public async getItemNamesToAllCoords(): Promise<Map<string, Vec3[]>> {
    const itemNamesToCoords: Map<string, Vec3[]> = new Map();
    for (const entity of this.vicinity.iterVisibleEntities()) {
      if (entity.name === "item") {
        // Ensure the loading of its uuid and PItem data
        const itemEntityWithData = await ensureItemData(this.bot, entity);
        if (!itemNamesToCoords.has(itemEntityWithData.itemData.name)) {
          itemNamesToCoords.set(itemEntityWithData.itemData.name, []);
        }
        itemNamesToCoords
          .get(itemEntityWithData.itemData.name)!
          .push(itemEntityWithData.entity.position);
      }
    }
    return itemNamesToCoords;
  }

  public async getItemNamesToClosestCoords(): Promise<Map<string, Vec3>> {
    const itemNamesToClosestCoords: Map<string, Vec3> = new Map();
    const itemNamesToAllCoords = await this.getItemNamesToAllCoords();
    for (const [itemName, coords] of itemNamesToAllCoords.entries()) {
      if (coords.length > 0) {
        // Find the closest coordinate to the bot's position
        const closestCoord = coords.reduce((closest, current) => {
          return closest.distanceTo(this.bot.entity.position) <
            current.distanceTo(this.bot.entity.position)
            ? closest
            : current;
        });
        itemNamesToClosestCoords.set(itemName, closestCoord);
      }
    }
    return itemNamesToClosestCoords;
  }

  public async getItemNamesToCounts(): Promise<Map<string, number>> {
    const itemNamesToCounts: Map<string, number> = new Map();
    for (const entity of this.vicinity.iterVisibleEntities()) {
      if (entity.name === "item") {
        // Ensure the loading of its uuid and PItem data
        const itemEntityWithData = await ensureItemData(this.bot, entity);
        if (!itemNamesToCounts.has(itemEntityWithData.itemData.name)) {
          itemNamesToCounts.set(itemEntityWithData.itemData.name, 0);
        }

        const hasItemCount = (item: any): item is { itemCount: number } => {
          return item && typeof item === "object" && "itemCount" in item;
        };

        const itemCount =
          itemEntityWithData.entity.metadata.find(hasItemCount)?.itemCount || 1;

        itemNamesToCounts.set(
          itemEntityWithData.itemData.name,
          itemNamesToCounts.get(itemEntityWithData.itemData.name)! + itemCount
        );
      }
    }
    return itemNamesToCounts;
  }
}

export class Vicinity {
  private bot: Bot;
  public name: VicinityName;
  public vicinitiesObserver: VicinitiesObserver;
  public distanceSortedOffsets: Vec3[];
  public offsets: Map<SerializedVoxelOffset, Vec3>;
  public visible: VisibleVicinityContents;

  constructor(bot: Bot, name: VicinityName, observer: VicinitiesObserver) {
    this.bot = bot;
    this.name = name;
    this.vicinitiesObserver = observer;
    this.distanceSortedOffsets = getVicinitiesToDistanceSortedOffsets(
      this.bot,
      this.vicinitiesObserver.radii
    ).get(name)!;
    this.offsets = new Map(
      this.distanceSortedOffsets.map((offset) => [
        serializeVec3(offset),
        offset,
      ])
    );
    this.visible = new VisibleVicinityContents(this.bot, this);
  }

  public *iterVisibleBlocks(): Generator<PBlock> {
    for (const offset of this.vicinitiesObserver.visibleBlocks.iterOffsetsWithSetValues()) {
      if (this.offsets.has(serializeVec3(offset))) {
        const block =
          this.vicinitiesObserver.visibleBlocks.getFromOffset(offset);
        assert(block);
        yield block;
      }
    }
  }

  public *iterVisibleEntities(): Generator<PEntity> {
    const voxelOfBotPos = this.bot.entity.position.floor();
    for (const entity of Object.values(this.bot.entities)) {
      const voxelOfPosition = entity.position.floor();
      const voxelOffsetOffPosition = voxelOfPosition.minus(voxelOfBotPos);
      if (
        this.offsets.has(serializeVec3(voxelOffsetOffPosition)) &&
        this.vicinitiesObserver.visibilityMask.getFromOffset(
          voxelOffsetOffPosition
        )
      ) {
        yield entity;
      }
    }
  }
}

export class DistantSurroundingsInADirection extends Vicinity {
  async getDTO(): Promise<DistantSurroundingsInADirectionDTO> {
    return {
      visibleBlockCounts: Object.fromEntries(
        this.visible.getBlockNamesToCounts()
      ),
      visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
      visibleItemCounts: Object.fromEntries(
        await this.visible.getItemNamesToCounts()
      ),
    };
  }
}

export class ImmediateSurroundings extends Vicinity {
  async getDTO(): Promise<ImmediateSurroundingsDTO> {
    const visibleBlocks: { [key: string]: [number, number, number][] } = {};
    for (const [
      blockName,
      allCoords,
    ] of this.visible.getBlockNamesToAllCoords()) {
      visibleBlocks[blockName] = Array.from(allCoords).map(
        (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
      );
    }

    const visibleItems: { [key: string]: [number, number, number][] } = {};
    for (const [
      itemName,
      coordsIterable,
    ] of await this.visible.getItemNamesToAllCoords()) {
      visibleItems[itemName] = Array.from(coordsIterable).map(
        (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
      );
    }

    return {
      visibleBlocks: visibleBlocks,
      visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
      visibleItems: visibleItems,
    };
  }
}

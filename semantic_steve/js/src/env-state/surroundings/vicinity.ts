import assert from "assert";
import * as fs from "fs";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import {
  SerializedVoxelOffset,
  SurroundingsRadii,
  VicinityName,
  DirectionName,
} from "../../types";
import { Block as PBlock } from "prismarine-block";
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

export class VicinitiesObserver {
  private bot: Bot;
  private visibilityRaycaster: VisibilityRaycaster;
  private curEyeVoxel?: Vec3;
  public radii: SurroundingsRadii;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
    this.visibilityRaycaster = new VisibilityRaycaster(
      bot,
      this.radii.distantSurroundingsRadius,
    );
    this.immediate = new ImmediateSurroundings(
      bot,
      VicinityName.IMMEDIATE_SURROUNDINGS,
      this,
    );
    this.distant = new Map<DirectionName, DistantSurroundingsInADirection>(
      Object.values(DirectionName).map((direction) => [
        direction,
        new DistantSurroundingsInADirection(
          bot,
          direction as any as VicinityName,
          this,
        ),
      ]),
    );
  }

  public get visibleBlocks(): OffsetBased3DArray<PBlock | null> {
    return this.visibilityRaycaster.visibleBlocks;
  }

  public beginObservation(): void {
    this.curEyeVoxel = this.bot.entity.position.floor();
    // Setup listeners
    this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
    this.bot.on("move", this.handleBotMove.bind(this));
  }

  public async handleBotMove(newBotPos: Vec3): Promise<void> {
    if (this.visibilityRaycaster.isRaycasting) return; // Throttle if already raycasting
    const newEyeVoxel = getEyePos(this.bot, newBotPos).floor();
    // if (this.curEyeVoxel && newEyeVoxel.equals(this.curEyeVoxel)) return;
    this.curEyeVoxel = newEyeVoxel;

    const raycasts: Array<
      [
        {
          phi: number;
          theta: number;
          hit: null | { x: number; y: number; z: number };
        },
      ]
    > = [];
    for await (const [vecNorm, pBlock] of this.visibilityRaycaster.doRaycasting(
      this.curEyeVoxel,
    )) {
      const orientation = new ThreeDimOrientation(vecNorm);
      const { phi, theta } = orientation.sphericalAngles;
      let offset = null;
      if (pBlock) {
        offset = pBlock.position.minus(newEyeVoxel);
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
  }

  public handleBlockUpdate(
    oldBlock: PBlock | null,
    newBlock: PBlock | null,
  ): void {
    if (oldBlock && newBlock) {
      assert(oldBlock.position.equals(newBlock.position));
    } // I think this is always true since falling (moving) blocks are considered 'entities'
  }
}

export class VisibleVicinityContents {
  private bot: Bot;
  private vicinity: Vicinity;
  private vicinitiesObserver: VicinitiesObserver;

  constructor(
    bot: Bot,
    vicinity: Vicinity,
    vicinityObserver: VicinitiesObserver,
  ) {
    this.bot = bot;
    this.vicinity = vicinity;
    this.vicinitiesObserver = vicinityObserver;
  }

  public *getDistinctBlockNames(): Iterable<string> {
    const alreadyYielded = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      if (!alreadyYielded.has(block.name)) {
        yield block.name;
        alreadyYielded.add(block.name);
      }
    }
  }

  public *getBlockNamesToClosestCoords(): Iterable<[string, Vec3]> {
    const alreadyYielded: Set<string> = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      if (!alreadyYielded.has(block.name)) {
        yield [block.name, block.position];
        alreadyYielded.add(block.name);
      }
    }
  }

  public getBlockNamesToAllCoords(): Map<string, Vec3[]> {
    const blockNamesToCoords: Map<string, Vec3[]> = new Map();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      if (!blockNamesToCoords.has(block.name)) {
        blockNamesToCoords.set(block.name, []);
      }
      blockNamesToCoords.get(block.name)!.push(block.position);
    }
    return blockNamesToCoords;
  }

  public getBlockNamesToCounts(): Map<string, number> {
    const blockNamesToCounts: Map<string, number> = new Map();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      if (!blockNamesToCounts.has(block.name)) {
        blockNamesToCounts.set(block.name, 0);
      }
      blockNamesToCounts.set(
        block.name,
        blockNamesToCounts.get(block.name)! + 1,
      );
    }
    return blockNamesToCounts;
  }

  public *getDistinctBiomeNames(): Iterable<string> {
    const alreadyYielded: Set<string> = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!alreadyYielded.has(biomeName)) {
        yield biomeName;
        alreadyYielded.add(biomeName);
      }
    }
  }

  public *getBiomeNamesToClosestCoords(): Iterable<[string, Vec3]> {
    const alreadyYielded: Set<string> = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!alreadyYielded.has(biomeName)) {
        yield [biomeName, block.position];
        alreadyYielded.add(biomeName);
      }
    }
  }

  public *getBiomeNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {
    const biomeNamesToCoords: Map<string, Vec3[]> = new Map();
    for (const block of this.vicinity.iterVisibleBlocksClosestToFarthest()) {
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!biomeNamesToCoords.has(biomeName)) {
        biomeNamesToCoords.set(biomeName, []);
      }
      biomeNamesToCoords.get(biomeName)!.push(block.position);
    }
    for (const [biomeName, coords] of biomeNamesToCoords.entries()) {
      yield [biomeName, coords];
    }
  }

  public *getDistinctItemNames(): Iterable<string> {}

  public *getItemNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getItemNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}
}

export class Vicinity {
  private bot: Bot;
  public name: VicinityName;
  private vicinitiesObserver: VicinitiesObserver;
  public distanceSortedOffsets: Vec3[];
  public offsets: Map<SerializedVoxelOffset, Vec3>;
  public visible: VisibleVicinityContents;

  constructor(bot: Bot, name: VicinityName, observer: VicinitiesObserver) {
    this.bot = bot;
    this.name = name;
    this.vicinitiesObserver = observer;
    this.distanceSortedOffsets = getVicinitiesToDistanceSortedOffsets(
      this.bot,
      this.vicinitiesObserver.radii,
    ).get(name)!;
    this.offsets = new Map(
      this.distanceSortedOffsets.map((offset) => [
        serializeVec3(offset),
        offset,
      ]),
    );
    this.visible = new VisibleVicinityContents(
      this.bot,
      this,
      this.vicinitiesObserver,
    );
  }

  public *iterVisibleBlocksClosestToFarthest(): Generator<PBlock> {
    for (const offset of this.vicinitiesObserver.visibleBlocks.iterOffsetsWithSetValues()) {
      if (this.offsets.has(serializeVec3(offset))) {
        const block =
          this.vicinitiesObserver.visibleBlocks.getFromOffset(offset);
        assert(block);
        yield block;
      }
    }
  }
}

export class DistantSurroundingsInADirection extends Vicinity {
  getDTO(): DistantSurroundingsInADirectionDTO {
    return {
      visibleBlockCounts: Object.fromEntries(
        this.visible.getBlockNamesToCounts(),
      ),
      visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
      visibleItemCounts: {}, //Object.fromEntries(this.itemEntityNamesToCounts),
    };
  }
}

export class ImmediateSurroundings extends Vicinity {
  getDTO(): ImmediateSurroundingsDTO {
    const visibleBlocks: { [key: string]: [number, number, number][] } = {};
    for (const [
      blockName,
      allCoords,
    ] of this.visible.getBlockNamesToAllCoords()) {
      visibleBlocks[blockName] = Array.from(allCoords).map(
        (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number],
      );
    }

    const visibleItems: { [key: string]: [number, number, number][] } = {};
    // for (const [itemName, coordsIterable] of this.getItemNamesToAllCoords()) {
    //   visibleItems[itemName] = Array.from(coordsIterable).map(
    //     (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
    //   );
    // }

    return {
      visibleBlocks: visibleBlocks,
      visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
      visibleItems: visibleItems,
    };
  }
}

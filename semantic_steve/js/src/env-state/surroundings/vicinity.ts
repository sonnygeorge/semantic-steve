import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "./common";
import { Block as PBlock } from "prismarine-block";
import { VisibilityRaycastManager } from "./visibility-raycast-manager";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";
import { getVicinityMasks } from "./get-vicinity-masks";
import { getCurEyePos, getVoxelOfPosition } from "../../utils/misc";
import {
  DistantSurroundingsInADirectionDTO,
  ImmediateSurroundingsDTO,
  SurroundingsDTO,
} from "./dto";

// The Main Idea(s):
// 1. Store stuff (blocks) in voxel space (3d arrays) which has implicit "distance" from bot & quick lookup with indices
// 2. Only do/manage N ongoing raycasts evenly distibuted over the possible eyeball orientations
//    => Allowing us to update only certain raycasts when we don't want to re-evaluate every raycast
// 3. Query/store blocks ONLY AFTER these managed raycasts confirm visibility

// Next TODO:
// - Implement the getters+DTOs (for blocks+biomes) and test like crazy!
// - Implement everything for itemEntityWithData
// - Clean up? Document? Maybe have

export class Vicinity {
  private bot: Bot;
  private manager: VicinitiesManager;
  public mask: VoxelSpaceAroundBotEyes<boolean>;
  public visible: VisibleVicinityContents;
  public name: VicinityName;

  constructor(
    bot: Bot,
    manager: VicinitiesManager,
    name: VicinityName,
    mask: VoxelSpaceAroundBotEyes<boolean>
  ) {
    this.bot = bot;
    this.manager = manager;
    this.name = name;
    this.mask = mask;
    this.visible = new VisibleVicinityContents(bot, this, manager);
  }

  public *iterVisibleBlocks(): // how: "closest-to-furthest" | "furthest-to-closest" = "closest-to-furthest"
  Generator<PBlock> {
    for (const offset of this.manager.visibleBlocks.iterOffsetsWithSetValues()) {
      if (this.mask.getFromOffset(offset)) {
        const block = this.manager.visibleBlocks.getFromOffset(offset);
        assert(block);
        yield block;
      }
    }
  }
}

export class DistantSurroundingsInADirection extends Vicinity {
  getDTO(): DistantSurroundingsInADirectionDTO {
    return {
      visibleBlockCounts: {}, //Object.fromEntries(this.blockNamesToCounts),
      visibleBiomes: Array.from(this.visible.getDistinctBiomeNames()),
      visibleItemCounts: {}, //Object.fromEntries(this.itemEntityNamesToCounts),
    };
  }
}

export class ImmediateSurroundings extends Vicinity {
  getDTO(): ImmediateSurroundingsDTO {
    const visibleBlocks: { [key: string]: [number, number, number][] } = {};
    // for (const [blockName, coordsIterable] of this.getBlockNamesToAllCoords()) {
    //   visibleBlocks[blockName] = Array.from(coordsIterable).map(
    //     (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
    //   );
    // }

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

const HANDLE_MOVEMENT_OVER = 0.1; // Minimum distance to move before updating raycasts

export class VicinitiesManager {
  private bot: Bot;
  private botPosAsOfLastMoveHandling: Vec3 | null = null;
  public raycastManager: VisibilityRaycastManager;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;
  public visibleBlocks: VoxelSpaceAroundBotEyes<PBlock | null>;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
    this.raycastManager = new VisibilityRaycastManager(
      bot,
      radii.distantSurroundingsRadius
    );

    const vicinityMasks = getVicinityMasks(bot, radii);

    this.immediate = new ImmediateSurroundings(
      bot,
      this,
      VicinityName.IMMEDIATE_SURROUNDINGS,
      vicinityMasks.get(VicinityName.IMMEDIATE_SURROUNDINGS)!
    );

    this.distant = new Map<DirectionName, DistantSurroundingsInADirection>();
    for (const directionName of Object.values(DirectionName)) {
      // (DirectionName is a subset of VicinityName)
      const vicinityName = directionName as any as VicinityName;
      this.distant.set(
        directionName,
        new DistantSurroundingsInADirection(
          bot,
          this,
          vicinityName,
          vicinityMasks.get(vicinityName)!
        )
      );
    }

    this.visibleBlocks = new VoxelSpaceAroundBotEyes<PBlock | null>(
      bot,
      radii.distantSurroundingsRadius,
      null // Default value for empty block spaces
    );
  }

  public hydrateVisibleBlocks(): void {
    for (const offset of this.visibleBlocks.iterAllOffsets()) {
      if (this.raycastManager.visibilityMask.getFromOffset(offset)) {
        const block = this.bot.world.getBlock(
          getVoxelOfPosition(offset).add(this.bot.entity.position)
        );
        if (block) {
          this.visibleBlocks.setFromOffset(offset, block);
        }
      } else {
        this.visibleBlocks.unsetFromOffset(offset);
      }
    }
  }

  public beginObservation(): void {
    const curEyePos = getCurEyePos(this.bot);
    this.raycastManager.visibilityMask.setInitialEyePos(curEyePos);
    this.raycastManager.hitsOrganizedIntoVoxelSpace.setInitialEyePos(curEyePos);
    this.visibleBlocks.setInitialEyePos(curEyePos);
    this.raycastManager.updateRaycasts(curEyePos, "everywhere");
    this.hydrateVisibleBlocks();
    this.botPosAsOfLastMoveHandling = this.bot.entity.position.clone();
    // Setup listeners
    this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
    this.bot.on("move", this.handleBotMove.bind(this));
    // TODO: entity...
  }

  public handleBlockUpdate(
    oldBlock: PBlock | null,
    newBlock: PBlock | null
  ): void {
    if (oldBlock && newBlock) {
      assert(oldBlock.position.equals(newBlock.position));
    } // I think this is always true since falling (moving) blocks are considered 'entities'
    const eyePos = this.raycastManager.visibilityMask.eyePosAtLastUpdate;
    assert(eyePos);

    const oldBlockWasVisible =
      oldBlock &&
      this.raycastManager.visibilityMask.getFromWorldPosition(
        oldBlock.position,
        eyePos
      );
    const newBlockIsVisible =
      newBlock &&
      this.raycastManager.visibilityMask.getFromWorldPosition(
        newBlock.position,
        eyePos
      );

    if (oldBlockWasVisible) {
      this.visibleBlocks.unsetFromWorldPosition(oldBlock.position, eyePos);
    }
    if (newBlockIsVisible) {
      this.visibleBlocks.setFromWorldPosition(
        newBlock.position,
        eyePos,
        newBlock
      );
    }

    if (oldBlockWasVisible && !newBlockIsVisible) {
      this.raycastManager.updateRaycasts(eyePos, {
        forWorldVoxel: getVoxelOfPosition(oldBlock.position),
      });
    }
  }

  public handleBotMove(newBotPosition: Vec3): void {
    assert(this.botPosAsOfLastMoveHandling);
    const curBotPosition = this.bot.entity.position;
    const prevBotPosition = this.botPosAsOfLastMoveHandling;
    // Do nothing if magnitude of bot movement is small enought that we don't want to process it
    if (
      curBotPosition.equals(prevBotPosition) ||
      curBotPosition.distanceTo(prevBotPosition) < HANDLE_MOVEMENT_OVER
    ) {
      return;
    }
    this.botPosAsOfLastMoveHandling = curBotPosition.clone();

    const curEyePos = getCurEyePos(this.bot);

    // Re-evaluate all visibility raycasts
    this.raycastManager.updateRaycasts(curEyePos, "everywhere");

    // Update the visibility mask's eye pos
    this.visibleBlocks.updateEyePosAndShiftAsNeeded(curEyePos);
    // Having updated this.visibleBlocks to the cur eye pos, we only need to update
    // this.visibleBlocks when it does not match up with the visibility mask.
    for (const offset of this.visibleBlocks.iterOffsetsWithSetValues()) {
      // Unset the blocks that are no longer visible
      if (!this.raycastManager.visibilityMask.getFromOffset(offset)) {
        this.visibleBlocks.unsetFromOffset(offset);
      }
    }
    for (const offset of this.raycastManager.visibilityMask.iterOffsetsWithSetValues()) {
      // Set the blocks that became visible
      if (!this.visibleBlocks.getFromOffset(offset)) {
        const worldPos = getVoxelOfPosition(offset).add(
          this.bot.entity.position
        );
        const block = this.bot.world.getBlock(worldPos);
        if (block) {
          this.visibleBlocks.setFromOffset(offset, block);
        } // Otherwise, it was likely an entity that was visible in this voxel (not a block)
      }
    }
  }
}

export class VisibleVicinityContents {
  private bot: Bot;
  private vicinity: Vicinity;
  private vicinityManager: VicinitiesManager;

  constructor(
    bot: Bot,
    vicinity: Vicinity,
    vicinityManager: VicinitiesManager
  ) {
    this.bot = bot;
    this.vicinity = vicinity;
    this.vicinityManager = vicinityManager;
  }

  // Block getters

  public *getDistinctBlockNames(): Iterable<string> {
    const blockNames = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      if (block) {
        blockNames.add(block.name);
      }
    }
    return blockNames;
  }

  public *getBlockNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getBlockNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}

  // Biome getters

  public *getDistinctBiomeNames(): Iterable<string> {
    const alreadyYielded: Set<string> = new Set<string>();
    for (const block of this.vicinity.iterVisibleBlocks()) {
      assert(block);
      const biomeName = this.bot.registry.biomes[block.biome.id].name;
      if (!alreadyYielded.has(biomeName)) {
        yield biomeName;
        alreadyYielded.add(biomeName);
      }
    }
  }

  public *getBiomeNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getBiomeNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}

  // Item getters

  public *getDistinctItemNames(): Iterable<string> {}

  public *getItemNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getItemNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}
}

import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "./common";
import { Block as PBlock } from "prismarine-block";
import { VisibilityRaycastManager } from "./visibility-raycast-manager";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";
import { getVicinityMasks } from "./get-vicinity-masks";
import { getVoxelOfPosition } from "../../../utils/misc";

// The Main Idea(s):
// 1. Store stuff (blocks) in voxel space (3d arrays) which has implicit "distance" from bot & quick lookup with indices
// 2. Only do/manage N ongoing raycasts evenly distibuted over the possible eyeball orientations
//    => Allowing us to update only certain raycasts when we don't want to re-evaluate every raycast
// 3. Query/store blocks ONLY AFTER these managed raycasts confirm visibility

// Next TODO:
// - Implement the getters+DTOs (for blocks+biomes) and test like crazy!
// - Implement everything for itemEntityWithData
// - Clean up? Document? Maybe have

const HANDLE_MOVEMENT_OVER = 0.1; // Minimum distance to move before updating raycasts

export class Vicinity {
  private bot: Bot;
  private manager: VicinitiesManager;
  public mask: VoxelSpaceAroundBotEyes<boolean>;
  public visible: VisibleContentsOfVicinity;
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
    this.visible = new VisibleContentsOfVicinity(bot, this, manager);
  }

  // TODO: Can having a bunch of "open" generators effectively cause a memory leak?
  public *iterCoords(
    how: "closest-to-furthest" | "furthest-to-closest" = "closest-to-furthest"
  ): Generator<Vec3> {
    // TODO
  }
}

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

    const vicinityMasks = getVicinityMasks(
      bot,
      radii.immediateSurroundingsRadius,
      radii.distantSurroundingsRadius
    );

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
      radii.immediateSurroundingsRadius,
      null // Default value for empty block spaces
    );
  }

  public hydrateVisibleBlocks(): void {
    for (const offset of this.visibleBlocks.iterOffsets()) {
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
    this.raycastManager.updateRaycasts("everywhere");
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

    const oldBlockWasVisible =
      oldBlock &&
      this.raycastManager.visibilityMask.getFromWorldPosition(
        oldBlock.position
      );
    const newBlockIsVisible =
      newBlock &&
      this.raycastManager.visibilityMask.getFromWorldPosition(
        newBlock.position
      );

    if (oldBlockWasVisible) {
      this.visibleBlocks.unsetFromWorldPosition(oldBlock.position);
    }
    if (newBlockIsVisible) {
      this.visibleBlocks.setFromWorldPosition(newBlock.position, newBlock);
    }

    if (oldBlockWasVisible && !newBlockIsVisible) {
      this.raycastManager.updateRaycasts({
        forWorldVoxel: getVoxelOfPosition(oldBlock.position),
      });
    }
  }

  public handleBotMove(newBotPosition: Vec3): void {
    assert(this.botPosAsOfLastMoveHandling);
    const curBotPosition = this.bot.entity.position;
    const prevBotPosition = this.botPosAsOfLastMoveHandling;
    if (
      curBotPosition.equals(prevBotPosition) ||
      curBotPosition.distanceTo(prevBotPosition) < HANDLE_MOVEMENT_OVER
    ) {
      return; // Do nothing if magnitude of bot movement is negligible
    }
    this.botPosAsOfLastMoveHandling = curBotPosition.clone();

    // Shift the voxel spaces around bot's eyes
    const shiftedOffset = this.visibleBlocks.updateBotEyePosAndShiftAsNeeded();
    if (!shiftedOffset) return; // We can stop here if there was no shift
    this.raycastManager.hitsOrganizedIntoVoxelSpace.updateBotEyePosAndShiftAsNeeded();
    this.raycastManager.visibilityMask.updateBotEyePosAndShiftAsNeeded();
    // Re-evaluate visibilities of all raycasts
    this.raycastManager.updateRaycasts("everywhere");
    // Since all the voxel spaces have been shifted the same way, we now only need to
    // Update the this.visibleBlocks when it does not match the visibility mask
    for (const idxs of new Map( // Copy to avoid mutation during iteration
      this.visibleBlocks.voxelSpace.idxsWithSetValues
    ).values()) {
      // Unset the blocks that are no longer visible
      const offset = this.visibleBlocks.indicesToOffset(idxs);
      if (!this.raycastManager.visibilityMask.getFromOffset(offset)) {
        this.visibleBlocks.unsetFromOffset(offset);
      }
    }
    for (const idxs of this.raycastManager.visibilityMask.voxelSpace.idxsWithSetValues.values()) {
      // Set the blocks that became visible
      const offset = this.raycastManager.visibilityMask.indicesToOffset(idxs);
      if (!this.visibleBlocks.getFromOffset(offset)) {
        const worldPos = getVoxelOfPosition(offset).add(
          this.bot.entity.position
        );
        const block = this.bot.world.getBlock(worldPos);
        if (block) {
          this.visibleBlocks.setFromOffset(offset, block);
        } else {
          // It was likely an entity that was visible in this voxel
        }
      }
    }
  }
}

export class VisibleContentsOfVicinity {
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

  // TODO: getters

  // Block

  public *getDistinctBlockNames(): Iterable<string> {}

  public *getBlockNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getBlockNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}

  // Biome

  public *getDistinctBiomeNames(): Iterable<string> {}

  public *getBiomeNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getBiomeNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}

  // Item

  public *getDistinctItemNames(): Iterable<string> {}

  public *getItemNamesToClosestCoords(): Iterable<[string, Vec3]> {}

  public *getItemNamesToAllCoords(): Iterable<[string, Iterable<Vec3>]> {}
}

export class DistantSurroundingsInADirection extends Vicinity {
  public getDTO(): any {
    // TODO: Implement/define a proper DTO type
  }
}

export class ImmediateSurroundings extends Vicinity {
  public getDTO(): any {
    // TODO: Implement/define a proper DTO type
  }
}

export class Surroundings {
  private bot: Bot;
  private vicinitiesManager: VicinitiesManager;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.vicinitiesManager = new VicinitiesManager(bot, radii);
    this.immediate = this.vicinitiesManager.immediate;
    this.distant = this.vicinitiesManager.distant;
    this.radii = this.vicinitiesManager.radii;
  }

  public beginObservation(): void {
    this.vicinitiesManager.beginObservation();
  }

  public *iterVicinities(): Generator<
    ImmediateSurroundings | DistantSurroundingsInADirection
  > {
    yield this.immediate;
    for (const direction of Object.values(DirectionName)) {
      yield this.distant.get(direction)!;
    }
  }
}

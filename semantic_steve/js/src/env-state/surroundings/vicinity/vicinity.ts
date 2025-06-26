import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { SurroundingsRadii, VicinityName, DirectionName } from "./common";
import { Block as PBlock } from "prismarine-block";
import { VisibilityRaycastManager } from "./visibility-raycast-manager";
import { VoxelSpaceAroundBotEyes } from "./voxel-space-around-bot-eyes";
import { getVicinityMasks } from "./get-vicinity-masks";

// The Main Idea(s):
// 1. Store stuff (blocks) in voxel space (3d arrays) which has implicit "distance" from bot & quick lookup with indices
// 2. Only do/manage N ongoing raycasts evenly distibuted over the possible eyeball orientations
//    => Allowing us to update only certain raycasts when we don't want to re-evaluate every raycast
// 3. Query/store blocks ONLY AFTER these managed raycasts confirm visibility

// Next TODO:
// - Set up listeners to actually do the eager management of everything
// - Implement the getters, DTOs, and test like crazy!

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
  private lastBotPosition: Vec3 | null = null;
  public raycastManager: VisibilityRaycastManager;
  public immediate: ImmediateSurroundings;
  public distant: Map<DirectionName, DistantSurroundingsInADirection>;
  public radii: SurroundingsRadii;
  public blocks: VoxelSpaceAroundBotEyes<PBlock | null>;

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

    this.blocks = new VoxelSpaceAroundBotEyes<PBlock | null>(
      bot,
      radii.immediateSurroundingsRadius,
      null // Default value for empty block spaces
    );
  }

  public handleBotMove(newBotPosition: Vec3): void {
    //
    // Shift blocks & load new (if the new ones are not occluded by others)
    // Re-evaluate visibilities
  }

  public handleNewBlock(pBlock: PBlock): void {
    // Check if in radius/ignored
    // Check if occluded by other blocks
    // If not, redo the raycasts that penetrate this block
  }

  public handleBlockGone(pBlock: PBlock, updateRaycasts: boolean = true): void {
    // Check if in radius/ignored/occluded? TODO: determine whether I want to store occluded blocks
    // Redo the raycasts that penetrate this block if updateRaycasts is true
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
    this.vicinitiesManager.raycastManager.updateRaycasts("everywhere");
    this.setUpListeners();
  }

  private setUpListeners(): void {} // TODO

  public *iterVicinities(): Generator<
    ImmediateSurroundings | DistantSurroundingsInADirection
  > {
    yield this.immediate;
    for (const direction of Object.values(DirectionName)) {
      yield this.distant.get(direction)!;
    }
  }
}

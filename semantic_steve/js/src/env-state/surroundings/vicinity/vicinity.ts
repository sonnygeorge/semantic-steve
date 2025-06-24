import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { VicinityName, DirectionName } from "./enums";
import { VoxelSpaceArray } from "./common";
import { Block as PBlock } from "prismarine-block";
import { VisibilityRaycastManager } from "./raycast-manager";

// The Main Idea(s):
// 1. Store stuff (blocks) in voxel space (3d arrays) which has implicit "distance" from bot & quick lookup with indices
// 2. Query/store blocks after raycasting indicates visibility
// 3. Only do/manage N ongoing raycasts evenly distibuted over the possible eyeball orientations
//    => Allowing us to update only certain raycasts when we don't want to re-evaluate every raycast

// TODO: numpy-like arrays for voxel space arrays

export class Vicinity {
  private static readonly bot: Bot;
  private static readonly manager: VicinitiesManager;
  public static readonly mask: VoxelSpaceArray<boolean>;
  public visible: VisibleContentsOfVicinity;
  public name: VicinityName;

  public *iterCoords(
    how: "closest-to-furthest" | "furthest-to-closest" = "closest-to-furthest"
  ): Generator<Vec3> {
    // TODO
  }
}

export class VicinitiesManager {
  private static readonly bot: Bot;
  private static readonly raycastManager: VisibilityRaycastManager;
  public static readonly immediate: ImmediateSurroundings;
  public static readonly distant: DistantSurroundingsInADirection;
  public static readonly radii: SurroundingsRadii;

  private lastBotPosition: Vec3 | null = null;

  blocks: VoxelSpaceArray<PBlock | null>;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
    // TODO
  }

  public handleBotMove(newBotPosition: Vec3): void {
    //
    // Shift blocks & load new (if the new ones are not occluded by others)
    // Re-evaluate visibilities
  }

  public handleNewBlock(PBlock): void {
    // Check if in radius/ignored
    // Check if occluded by other blocks
    // If not, redo the raycasts that penetrate this block
  }

  public handleBlockGone(PBlock, updateRaycasts: bool = true): void {
    // Check if in radius/ignored/occluded? TODO: determine whether I want to store occluded blocks
    // Redo the raycasts that penetrate this block if updateRaycasts is true
  }
}

export class VisibleContentsOfVicinity {
  private static readonly bot: Bot;
  private static readonly vicinity: Vicinity;

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
  public static readonly immediate: ImmediateSurroundings;
  public static readonly distant: DistantSurroundingsInADirection;
  public static readonly radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.vicinitiesManager = new VicinitiesManager(bot, radii);
    this.immediate = this.vicinitiesManager.immediate;
    this.distant = this.vicinitiesManager.distant;
    this.radii = this.vicinitiesManager.radii;
    this.setUpListeners();
  }

  private setUpListeners(): void {} // TODO

  public *iterVicinities(): Generator<
    ImmediateSurroundings | DistantSurroundingsInADirection
  > {
    yield this.immediate;
    for (const direction of Object.values(DirectionName)) {
      yield this.distant[direction];
    }
  }
}

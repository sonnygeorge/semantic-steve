import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import {
  Skill,
  SkillMetadata,
  SkillResolutionHandler,
  SkillStatus,
} from "../skill";
import { MAX_MINING_REACH as MAX_REACH } from "../../constants";
import {
  MineBlocksResults,
  MineBlocksPartialSuccessReason as PartialSuccessReason,
} from "./results";
import { Block } from "../../thing";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { PickupItem } from "../pickup-item/pickup-item";
import { SkillResult } from "../../types";
import { asyncSleep } from "../../utils/generic";
import { ItemEntity } from "../../thing/item-entity";
import { BLOCK_DROP_WAIT_MS } from "../../constants";

// TODO: Add optional 'with' (tool) argument
// TODO (someday): Add handling for silk touch
// TODO (someday): Figure out why oak_leaves drops is [] in minecraft-data

export class MineBlocks extends Skill {
  public static readonly TIMEOUT_MS: number = 38000; // 38 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "mineBlocks",
    signature: "mineBlocks(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Auto-equipping the best tool for the job, mines and gathers the drops from a
         * specified quantity of block, assuming they are visible in the immediate
         * surroundings.
         *
         * TIP: Don't mine too many at a time; prefer small, incremental quantities
         * (e.g. 1-6) in order to avoid timeout issues.
         *
         * @param block - The block to mine.
         * @param quantity - Optional quantity to mine. Defaults to 1.
         */
      `,
  };

  private activeSubskill?: PathfindToCoordinates | PickupItem;
  private shouldBeDoingStuff: boolean = true;
  private shouldTerminateSubskillWaiting: boolean = false;
  private blockTypeToMine?: Block;
  private numBlocksToMine?: number;
  private numBlocksBroken: number = 0;
  private numDropPickupsAttempted: number = 0;
  private quantityOfDropInInventoryAtInvocation?: number;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  /**
   * Gets the block to mine drop info if this.blockTypeToMine is defined.
   *
   * NOTE: If we want to change whether we want/pick up a silk-touch drop, this will need
   * to be looked at closer and this whole skill will likely need to take some argument
   * for that.
   */
  private get blockToMineDrop(): null | {
    minCount: number;
    maxCount: number;
    itemEntity: ItemEntity;
  } {
    if (!this.blockTypeToMine) {
      return null;
    }
    const blockToMineDrops = this.blockTypeToMine.pblock.drops;
    let minCount: number = 1;
    let maxCount: number = 1;
    let itemID: number = -1;
    if (typeof blockToMineDrops === "number") {
      // PBlock.drops is a number
      itemID = blockToMineDrops;
    } else if (Array.isArray(blockToMineDrops) && blockToMineDrops.length > 0) {
      const firstDrop = blockToMineDrops[0];
      if (typeof firstDrop === "number") {
        itemID = firstDrop;
      } else if (firstDrop && typeof firstDrop === "object") {
        const drop = firstDrop.drop;
        if (typeof drop === "number") {
          itemID = drop;
        } else if (drop && typeof drop === "object" && "id" in drop) {
          itemID = drop.id;
        } else {
          throw new Error(
            `Unexpected Pblock.drops format: ${JSON.stringify(
              blockToMineDrops,
            )}`,
          );
        }
        minCount = firstDrop.minCount ?? 1; // Set to one if undefined
        maxCount = firstDrop.maxCount ?? 1; // Set to one if undefined
      }
    } else if (
      Array.isArray(blockToMineDrops) &&
      blockToMineDrops.length === 0
    ) {
      // PBlock.drops is an empty array
      return null;
    } else {
      throw new Error(
        `Unexpected Pblock.drops format: ${JSON.stringify(blockToMineDrops)}`,
      );
    }
    if (itemID === -1) {
      throw new Error(
        `Unexpected Pblock.drops format: ${JSON.stringify(blockToMineDrops)}`,
      );
    }
    return {
      minCount: minCount,
      maxCount: maxCount,
      itemEntity: new ItemEntity(this.bot, undefined, itemID),
    };
  }

  private didAcquireExpectedMinDropCount(): boolean {
    assert(this.blockToMineDrop);
    assert(this.numBlocksToMine);
    assert(this.quantityOfDropInInventoryAtInvocation !== undefined);
    const expectedMinDropCount =
      this.blockToMineDrop.minCount * this.numBlocksToMine;
    const numInInventory =
      this.blockToMineDrop.itemEntity.getTotalCountInInventory();
    const numAcquired =
      numInInventory - this.quantityOfDropInInventoryAtInvocation;
    return numAcquired >= expectedMinDropCount;
  }

  private resolveAfterSomeMining(
    partialSuccessReason?: PartialSuccessReason,
  ): void {
    assert(this.blockTypeToMine);
    assert(this.numBlocksToMine);

    this.shouldBeDoingStuff = false;

    if (!this.blockToMineDrop) {
      if (partialSuccessReason) {
        return this.resolve(
          new MineBlocksResults.PartialSuccess(
            this.blockTypeToMine.name,
            this.numBlocksBroken,
            this.numBlocksToMine,
            undefined,
            0,
            partialSuccessReason,
          ),
        );
      } else {
        return this.resolve(
          new MineBlocksResults.Success(
            this.blockTypeToMine.name,
            this.numBlocksBroken,
            this.numBlocksToMine,
            undefined,
            0,
          ),
        );
      }
    }
    assert(this.quantityOfDropInInventoryAtInvocation !== undefined);
    const numAcquired =
      this.blockToMineDrop.itemEntity.getTotalCountInInventory() -
      this.quantityOfDropInInventoryAtInvocation;
    if (this.didAcquireExpectedMinDropCount()) {
      return this.resolve(
        new MineBlocksResults.Success(
          this.blockTypeToMine.name,
          this.numBlocksBroken,
          this.numBlocksToMine,
          this.blockToMineDrop.itemEntity.name,
          numAcquired,
        ),
      );
    } else {
      return this.resolve(
        new MineBlocksResults.PartialSuccess(
          this.blockTypeToMine.name,
          this.numBlocksBroken,
          this.numBlocksToMine,
          this.blockToMineDrop.itemEntity.name,
          numAcquired,
          partialSuccessReason,
        ),
      );
    }
  }

  // =============
  // Mining logic
  // =============

  private async assessMineabilityandEquipBestTool(): Promise<void> {
    assert(this.blockTypeToMine);

    const [canMine, bestToolID] =
      this.blockTypeToMine.assessCurrentMineability();

    if (!canMine) {
      // NOTE: Reason = 'tool consumed' since we started w/ a viable tool
      this.resolveAfterSomeMining(PartialSuccessReason.TOOL_CONSUMED);
    }

    // Equip best tool
    if (!this.shouldBeDoingStuff) {
      return;
    }
    if (bestToolID === null) {
      // Best option is to "punch it with fist"
      await this.bot.unequip("hand");
    } else {
      await this.bot.equip(bestToolID, "hand");
    }
  }

  private async getDigCoordsAfterPathfindingToNearestBlockToMine(): Promise<Vec3 | null> {
    assert(this.blockTypeToMine);
    let nearestPosOfBlockType =
      // TODO: Somehow prefer same y-level and especially avoid digging straight down?
      await this.blockTypeToMine.locateNearestInImmediateSurroundings();

    if (!nearestPosOfBlockType) {
      const reason = PartialSuccessReason.NO_MORE_IN_IMMEDIATE_SURROUNDINGS;
      this.resolveAfterSomeMining(reason);
      return null;
    }

    // Attempt to pathfind over if this position is out of reach
    if (
      nearestPosOfBlockType.distanceTo(this.bot.entity.position) >= MAX_REACH
    ) {
      let pathfindingToBlockWasSuccess: boolean | undefined = undefined;

      // Callback that sets the pathfindingToBlockWasSuccess variable to reflect
      // whether the pathfinding to block was successful
      const onPathfindToBlockResolution = async (
        _: SkillResult,
      ): Promise<void> => {
        assert(this.activeSubskill);
        this.activeSubskill = undefined;
        nearestPosOfBlockType =
          await this.blockTypeToMine!.locateNearestInImmediateSurroundings();
        if (
          nearestPosOfBlockType &&
          nearestPosOfBlockType.distanceTo(this.bot.entity.position) < MAX_REACH
        ) {
          pathfindingToBlockWasSuccess = true;
        } else {
          pathfindingToBlockWasSuccess = false;
        }
      };

      // Invoke pathfinding skill
      this.activeSubskill = new PathfindToCoordinates(
        this.bot,
        onPathfindToBlockResolution,
      );
      await this.activeSubskill.invoke([
        nearestPosOfBlockType.x,
        nearestPosOfBlockType.y,
        nearestPosOfBlockType.z,
      ]);

      // Wait for pathfindingToBlockWasSuccess to be set
      while (
        pathfindingToBlockWasSuccess === undefined ||
        this.shouldTerminateSubskillWaiting
      ) {
        await asyncSleep(50); // Check every 50ms
      }

      if (!pathfindingToBlockWasSuccess) {
        const reason = PartialSuccessReason.COULD_NOT_PATHFIND_UNTIL_REACHABLE;
        this.resolveAfterSomeMining(reason);
        return null;
      }
    }
    // If we are here, we have a reachable block to mine
    return nearestPosOfBlockType;
  }

  private async attemptDropPickup(): Promise<void> {
    if (this.blockToMineDrop) {
      if (!this.shouldBeDoingStuff) {
        return;
      }
      // Wait for a bit to make sure the item has dropped and settled
      await asyncSleep(BLOCK_DROP_WAIT_MS);
      if (!this.shouldBeDoingStuff) {
        return;
      }

      let pickupAttemptComplete: boolean = false;

      const onPickupItemResolution = async (
        result: SkillResult,
      ): Promise<void> => {
        assert(this.activeSubskill);
        this.activeSubskill = undefined;
        pickupAttemptComplete = true;
      };

      // Invoke pickup item skill
      this.activeSubskill = new PickupItem(this.bot, onPickupItemResolution);
      await this.activeSubskill.invoke(this.blockToMineDrop.itemEntity);

      // Wait for pickupWasSuccess to be set
      while (!pickupAttemptComplete || this.shouldTerminateSubskillWaiting) {
        await asyncSleep(50); // Check every 50ms
      }
    }
    this.numDropPickupsAttempted++;
  }

  private async attemptToMineAndPickupDropsOnce(): Promise<void> {
    assert(this.blockTypeToMine);
    assert(this.numBlocksToMine);
    await this.assessMineabilityandEquipBestTool();
    if (!this.shouldBeDoingStuff) {
      return;
    }
    const digCoords =
      await this.getDigCoordsAfterPathfindingToNearestBlockToMine();
    if (!this.shouldBeDoingStuff) {
      return;
    }
    assert(digCoords);
    const block = this.bot.blockAt(digCoords);
    await this.bot.dig(block!);
    this.numBlocksBroken++;
    await this.attemptDropPickup();
  }

  private async startOrResumeMining(): Promise<void> {
    assert(this.numBlocksToMine !== undefined);
    // If we are resuming from a pause that happened before a drop was picked up
    if (
      this.numBlocksBroken < this.numDropPickupsAttempted &&
      this.blockToMineDrop &&
      this.blockToMineDrop.itemEntity.isVisibleInImmediateSurroundings()
    ) {
      await this.attemptDropPickup();
    }
    // Main loop to attempt mining blocks until resolution or pause
    while (this.numDropPickupsAttempted < this.numBlocksToMine) {
      await this.attemptToMineAndPickupDropsOnce();
      if (!this.shouldBeDoingStuff) {
        return;
      }
    }
    this.resolveAfterSomeMining();
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(block: string, quantity: number = 1): Promise<void> {
    this.status = SkillStatus.ACTIVE_RUNNING;
    try {
      this.blockTypeToMine = new Block(this.bot, block);
    } catch (err) {
      return this.resolve(new MineBlocksResults.InvalidBlock(block));
    }

    if (!this.blockTypeToMine.isVisibleInImmediateSurroundings()) {
      return this.resolve(
        new MineBlocksResults.BlockNotInImmediateSurroundings(block),
      );
    }

    const [canMine, _] = this.blockTypeToMine.assessCurrentMineability();
    if (!canMine) {
      return this.resolve(new MineBlocksResults.MissingNecessaryTool(block));
    }

    // Prepare state variables before starting mining
    this.numBlocksToMine = quantity;
    this.numBlocksBroken = 0;
    this.numDropPickupsAttempted = 0;
    this.quantityOfDropInInventoryAtInvocation =
      this.blockToMineDrop?.itemEntity.getTotalCountInInventory();
    this.shouldBeDoingStuff = true;
    this.shouldTerminateSubskillWaiting = false;
    await this.startOrResumeMining();
  }

  public async doPause(): Promise<void> {
    this.shouldBeDoingStuff = false;
    if (this.activeSubskill) {
      await this.activeSubskill.pause();
    }
  }

  public async doResume(): Promise<void> {
    this.shouldBeDoingStuff = true;
    if (this.activeSubskill) {
      // Since, above, we set shouldBeDoingStuff back to true, the mining loop that was
      // awaiting the resolution of this subskill will pick up as if there was no pause.
      await this.activeSubskill.resume();
    } else {
      // Otherwise, the mining loop exited because shouldBeDoingStuff was set to false
      // during pause and we need to start it again.
      await this.startOrResumeMining();
    }
  }

  public async doStop(): Promise<void> {
    this.shouldBeDoingStuff = false;
    this.shouldTerminateSubskillWaiting = true;
    if (this.activeSubskill) {
      await this.activeSubskill.stop();
    }
  }
}

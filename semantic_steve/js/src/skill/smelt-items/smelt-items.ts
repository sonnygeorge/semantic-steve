import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block as PBlock } from "prismarine-block";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { SmeltItemsResults } from "./results";
import { ItemEntity } from "../../thing/item-entity";
import { Block } from "../../thing/block";
import { InvalidThingError, SkillResult } from "../../types";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { PlaceBlock } from "../place-block/place-block";
import { asyncSleep } from "../../utils/generic";
import { PlaceBlockResults } from "../place-block/results";
import { isWithinInteractionReach } from "../../utils/block";
import { isFuel, getSmeltingProductName } from "../../utils/smelting";
import { MineBlocks } from "../mine-blocks/mine-blocks";
import { MineBlocksResults } from "../mine-blocks/results";

// TODO: Possible refactor ideas
// - Waiting on subskill (should terminate, pause, etc.) abstraction that gets inherited from skill
// - Make everything use isWithinInteractionReach() util
// - Skill commonalities: separate validateInputs, setupSkill, doSkill (all doSkills should be idempotent)
//    - this.state.itemToSmelt instead of this.itemToSmelt
//    - charts of how idempotent flows work and make doSkill read like a book
//    - centralize resolves always to clear this.state?
// - At the least, make craft-items methods a little more atomic like in this skill
// - Idempotent "unit-of-action" sequence sort of like state pattern
// (separate functions that take the skill and check its shouldBeDoingStuff flag)
// in a loop that alternates b/w awaiting uoa and checking shouldBeDoingStuff for exit
// E.g.:
// after, [validate_inputs, setup_skill]:
// idempotent_action_sequence = [
//   resolve_if_already_acquired_expected_result, # checks skill.state.already_acquired_expected_result / precon: (assert skill.state is not None)
//   resolve_if_pause_caused_movement_away_from_furnace, # if (skill.state.furnace_with_items and skill.state.furnace_with_items_is_too_far_away) or not (skill.state.at_least_one_furnace_exists_in_inventory or skill.state.furnace_exists_in_immediate_surrounddings), resolve
//   place_furnace_if_needed, # if not skill.state.furnace_with_items and not skill.state.furnace_exists_in_immediate_surrounddings, place from inventory / precon: not skill.state.furnace_with_items_is_too_far_away if skill.state.furnace_with_items else skill.state.at_least_one_furnace_exists_in_inventory
//   pathfind_to_furnace_if_needed, # pathfind to furnace / precon: skill.state.furnace_in_immediate_surrounddings or (skill.state.furnace_with_items and not skill.state.furnace_with_items_is_too_far_away)
//   place_items_in_furnace_if_needed, # ... etc.
//   wait_for_smelting_to_finish,
//   withdraw_all_items_from_furnace,
//   resolve_after_smelting_completes,
// ]
// for action in idempotent_action_sequence:
//   while (should_be_doing_stuff):
//     await action()
//
// This way it has the cleanliness of the state pattern without the boilerplate and need
// to manage transition dynamics/logic--it just always through this idempotent sequence

export class SmeltItems extends Skill {
  public static readonly TIMEOUT_MS: number = 90000; // 90 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "smeltItems",
    signature:
      "smeltItems(item: string, withFuelItem: string, quantityToSmelt: number = 1)",
    docstring: `
        /**
         * Smelts one or more of an item, assuming a furnace is either in inventory or in
         * the immediate surroundings.
         *
         * TIP: Do not call this function with very high quantities that will take a long
         * time to smelt and likely result in a timeout. Instead, prefer smelting large
         * quantities in smaller incremental batches.
         *
         * @param item - The item to smelt.
         * @param withFuelItem - The fuel item to use (e.g., coal).
         * @param quantityToSmelt - The quantity to smelt. Defaults to 1.
         */
      `,
  };

  private activeSubskill?: PathfindToCoordinates | PlaceBlock | MineBlocks;
  private shouldBeDoingStuff: boolean = false;
  private shouldTerminateSubskillWaiting: boolean = false;

  private itemToSmelt?: ItemEntity;
  private quantityToSmelt?: number;

  private fuelItem?: ItemEntity;

  private expectedResultItem?: ItemEntity;
  private expectedResultItemQuantity?: number;

  private resultQuantityInInventoryBeforeSmelting?: number;
  private furnaceWithItems?: PBlock;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private getNumOfResultItemAcquired(): number {
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);
    const resultQuantityCurrentlyInInventory =
      this.expectedResultItem.getTotalCountInInventory();
    return (
      resultQuantityCurrentlyInInventory -
      this.resultQuantityInInventoryBeforeSmelting
    );
  }

  private hasAcquiredExpectedResult(): boolean {
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);
    return this.getNumOfResultItemAcquired() >= this.expectedResultItemQuantity;
  }

  private resolveAfterSmelting(mineFurnaceResult?: SkillResult): void {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.fuelItem);
    this.shouldBeDoingStuff = false;
    let result = new SmeltItemsResults.Success();
    if (!this.hasAcquiredExpectedResult()) {
      assert(this.fuelItem.getTotalCountInInventory() == 0);
      result = new SmeltItemsResults.RanOutOfFuelBeforeFullCompletion(
        this.fuelItem.name,
      );
    }
    if (
      mineFurnaceResult &&
      !(mineFurnaceResult instanceof MineBlocksResults.Success)
    ) {
      result.message += ` ${mineFurnaceResult.message}`;
    }
    this.resolve(result);
  }

  private closeFurnaceWindow(): void {
    if (this.bot.currentWindow) {
      this.bot.closeWindow(this.bot.currentWindow);
    }
  }

  private async withdrawAllItemsFromFurnace(furnace: PBlock): Promise<void> {
    assert(isWithinInteractionReach(this.bot, furnace.position));
    const furnaceObj = await this.bot.openFurnace(furnace);
    if (furnaceObj.fuelItem()) {
      await furnaceObj.takeFuel();
    }
    if (furnaceObj.inputItem()) {
      await furnaceObj.takeInput();
    }
    if (furnaceObj.outputItem()) {
      await furnaceObj.takeOutput();
    }
    this.closeFurnaceWindow();
  }

  private async putToSmeltItemsIntoFurnace(furnace: PBlock): Promise<void> {
    assert(isWithinInteractionReach(this.bot, furnace.position));
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    const furnaceObj = await this.bot.openFurnace(furnace);
    await furnaceObj.putInput(this.itemToSmelt.id, null, this.quantityToSmelt);
    this.furnaceWithItems = furnace;
    this.closeFurnaceWindow();
  }

  private async waitForSmeltingToFinish(): Promise<void> {
    assert(this.furnaceWithItems);
    assert(this.fuelItem);
    assert(isWithinInteractionReach(this.bot, this.furnaceWithItems.position));
    const furnaceObj = await this.bot.openFurnace(this.furnaceWithItems);
    // Add fuel until input item has run out (all smelted) or we run out of fuel
    while (furnaceObj.inputItem()) {
      if (!furnaceObj.fuelItem()) {
        if (this.fuelItem.getTotalCountInInventory() < 1) {
          break; // No fuel left
        }
        try {
          await furnaceObj.putFuel(this.fuelItem.id, null, 1);
        } catch (err) {
          // Presumably errored because no fuel left
          break;
        }
        assert(furnaceObj.fuelItem());
      }
      await asyncSleep(100);
      if (!this.shouldBeDoingStuff) {
        this.closeFurnaceWindow();
        return; // Exit on pause or stop
      }
    }
    this.closeFurnaceWindow();
  }

  private async pathfindToFurnaceIfNeeded(furnaceCoords: Vec3): Promise<void> {
    if (isWithinInteractionReach(this.bot, furnaceCoords)) {
      return; // Already in range
    }

    let furnaceIsInRangeAfterPathfinding: boolean | undefined = undefined;
    const handlePathfindingResolution = (result: SkillResult) => {
      this.activeSubskill = undefined;
      furnaceIsInRangeAfterPathfinding =
        result instanceof SmeltItemsResults.Success;
    };

    this.activeSubskill = new PathfindToCoordinates(
      this.bot,
      handlePathfindingResolution.bind(this),
    );
    await this.activeSubskill.invoke(furnaceCoords);

    // Wait for the pathfinding to finish
    while (
      furnaceIsInRangeAfterPathfinding === undefined ||
      this.shouldTerminateSubskillWaiting
    ) {
      await asyncSleep(50);
    }

    if (!furnaceIsInRangeAfterPathfinding) {
      this.shouldBeDoingStuff = false;
      const result = new SmeltItemsResults.FailedToGetCloseEnoughToFurnace(
        furnaceCoords,
      );
      this.resolve(result);
      return;
    }
  }

  private async placeFurnace(): Promise<void> {
    let placeFurnaceResult: SkillResult | undefined = undefined;

    const handlePlaceFurnaceResolution = (result: SkillResult) => {
      this.activeSubskill = undefined;
      placeFurnaceResult = result;
    };

    this.activeSubskill = new PlaceBlock(
      this.bot,
      handlePlaceFurnaceResolution.bind(this),
    );
    await this.activeSubskill.invoke("furnace");

    // Wait for the placement to finish
    while (
      placeFurnaceResult === undefined ||
      this.shouldTerminateSubskillWaiting
    ) {
      await asyncSleep(50);
    }
    const wasSuccess =
      (placeFurnaceResult as SkillResult) instanceof PlaceBlockResults.Success;

    if (!wasSuccess) {
      this.shouldBeDoingStuff = false;
      const result = new SmeltItemsResults.FurnacePlacementFailed(
        placeFurnaceResult,
      );
      this.resolve(result);
      return;
    }
  }

  private async mineFurnaceAfterSmeltingIfNeededAndResolve(): Promise<void> {
    const handleMineBlocksResolution = (mineBlocksResult: SkillResult) => {
      this.activeSubskill = undefined;
      this.resolveAfterSmelting(mineBlocksResult);
    };

    this.activeSubskill = new MineBlocks(
      this.bot,
      handleMineBlocksResolution.bind(this),
    );
    await this.activeSubskill.invoke("furnace", 1);

    // Wait for the mining to finish
    while (this.activeSubskill) {
      await asyncSleep(50);
      if (this.shouldTerminateSubskillWaiting) {
        this.activeSubskill = undefined;
        this.resolveAfterSmelting();
        return;
      }
    }
  }

  private async startOrResumeSmelting(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);

    if (this.hasAcquiredExpectedResult()) {
      // We likely got here from resuming after a pause that occured while awaiting
      // this.withdrawAllItemsFromFurnace() (which put the results into the inventory)
      await this.mineFurnaceAfterSmeltingIfNeededAndResolve();
      return;
    }

    if (!this.furnaceWithItems) {
      // Handle case of a having moved away from placed furnace (before inputting items) during a pause
      const furnaceBlockType = new Block(this.bot, "furnace");
      const furnaceItemType = new ItemEntity(this.bot, "furnace");
      const furnaceIsInInventory =
        furnaceItemType.getTotalCountInInventory() > 0;

      let nearestImmediateSurroundingsFurnaceCoords =
        furnaceBlockType.locateNearestInImmediateSurroundings();

      if (!nearestImmediateSurroundingsFurnaceCoords && !furnaceIsInInventory) {
        // No furnace available
        this.shouldBeDoingStuff = false;
        this.resolve(
          new SmeltItemsResults.FurnaceNoLongerInImmediateSurroundings(),
        );
        return;
      }

      // Place a furnace if none in immediate surroundings
      if (!nearestImmediateSurroundingsFurnaceCoords && furnaceIsInInventory) {
        await this.placeFurnace();
        if (!this.shouldBeDoingStuff) {
          return; // Exit on pause or stop
        }
        nearestImmediateSurroundingsFurnaceCoords =
          furnaceBlockType.locateNearestInImmediateSurroundings();
      }
      assert(nearestImmediateSurroundingsFurnaceCoords); // Should always be set by now

      // Pathfind to the furnace if not reachable
      await this.pathfindToFurnaceIfNeeded(
        nearestImmediateSurroundingsFurnaceCoords,
      );
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }

      // Input items into the furnace
      const furnace = this.bot.blockAt(
        nearestImmediateSurroundingsFurnaceCoords,
      );
      assert(furnace);

      await this.withdrawAllItemsFromFurnace(furnace);
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }
      await this.putToSmeltItemsIntoFurnace(furnace);
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }
    } else {
      assert(this.furnaceWithItems);
      await this.pathfindToFurnaceIfNeeded(this.furnaceWithItems.position);
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }
    }
    assert(this.furnaceWithItems);

    await this.waitForSmeltingToFinish();

    if (!this.shouldBeDoingStuff) {
      return; // Exit on pause or stop
    }
    await this.withdrawAllItemsFromFurnace(this.furnaceWithItems);
    this.furnaceWithItems = undefined;
    if (!this.shouldBeDoingStuff) {
      return; // Exit on pause or stop
    }

    await this.mineFurnaceAfterSmeltingIfNeededAndResolve();
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    item: string | ItemEntity,
    withFuelItem: string | ItemEntity,
    quantityToSmelt: number = 1,
  ): Promise<void> {
    if (typeof item === "string") {
      // Validate the item string
      try {
        this.itemToSmelt = new ItemEntity(this.bot, item);
      } catch (err) {
        if (err instanceof InvalidThingError) {
          const result = new SmeltItemsResults.InvalidItem(item);
          this.resolve(result);
          return;
        } else {
          throw err;
        }
      }
    } else {
      this.itemToSmelt = item;
    }
    assert(this.itemToSmelt);

    // Validate the fuel item string
    if (typeof withFuelItem === "string") {
      try {
        this.fuelItem = new ItemEntity(this.bot, withFuelItem);
      } catch (err) {
        if (err instanceof InvalidThingError) {
          const result = new SmeltItemsResults.InvalidFuelItem(withFuelItem);
          this.resolve(result);
          return;
        } else {
          throw err;
        }
      }
    } else {
      this.fuelItem = withFuelItem;
    }
    assert(this.fuelItem);

    // Check if the item is smeltable
    const expectedResultItemName = getSmeltingProductName(
      this.itemToSmelt.name,
    );
    if (!expectedResultItemName) {
      this.resolve(
        new SmeltItemsResults.NonSmeltableItem(this.itemToSmelt.name),
      );
      return;
    }
    this.expectedResultItem = new ItemEntity(this.bot, expectedResultItemName);
    this.expectedResultItemQuantity = quantityToSmelt; // Always 1:1 in Minecraft

    // Check if the fuel item is usable as fuel
    if (!isFuel(this.fuelItem.name)) {
      this.resolve(
        new SmeltItemsResults.FuelItemNotUsableAsFuel(this.fuelItem.name),
      );
      return;
    }

    if (quantityToSmelt > 64) {
      this.resolve(new SmeltItemsResults.CannotSmeltMoreThan64AtATime());
      return;
    }

    // Check if a furnace is available
    const furnaceIsAvailable = () => {
      const furnaceItemType = new ItemEntity(this.bot, "furnace");
      const furnaceBlockType = new Block(this.bot, "furnace");
      return (
        furnaceBlockType.isVisibleInImmediateSurroundings() ||
        furnaceItemType.getTotalCountInInventory() > 0
      );
    };

    if (!furnaceIsAvailable()) {
      this.resolve(
        new SmeltItemsResults.NoFurnaceAvailable(this.itemToSmelt.name),
      );
      return;
    }

    // Check if we have enough of the item to smelt
    const itemCount = this.itemToSmelt.getTotalCountInInventory();
    if (itemCount < quantityToSmelt) {
      this.resolve(
        new SmeltItemsResults.InsufficientToSmeltItems(
          quantityToSmelt,
          this.itemToSmelt.name,
        ),
      );
      return;
    }

    this.fuelItem.getTotalCountInInventory();
    if (this.fuelItem.getTotalCountInInventory() < 1) {
      this.resolve(
        new SmeltItemsResults.FuelItemNotInventory(
          this.fuelItem,
          this.itemToSmelt.name,
        ),
      );
      return;
    }

    this.quantityToSmelt = quantityToSmelt;
    this.resultQuantityInInventoryBeforeSmelting =
      this.expectedResultItem.getTotalCountInInventory();
    this.furnaceWithItems = undefined;
    this.shouldBeDoingStuff = true;
    this.shouldTerminateSubskillWaiting = false;
    this.startOrResumeSmelting();
  }

  public async doPause(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = false;
    if (this.activeSubskill) {
      await this.activeSubskill.pause();
    }
  }

  public async doResume(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = true;
    if (this.activeSubskill) {
      // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
      await this.activeSubskill.resume();
    } else {
      // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
      this.startOrResumeSmelting();
    }
  }

  public async doStop(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.resultQuantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = false;
    this.shouldTerminateSubskillWaiting = true;
    if (this.activeSubskill) {
      await this.activeSubskill.stop();
    }
  }
}

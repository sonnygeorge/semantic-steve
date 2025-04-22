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

// TODO: Possible refactor ideas
// - Waiting on subskill (should terminate, pause, etc.) abstraction that gets inherited from skill
// - Make everything use isWithinInteractionReach() util
// - Skill commonalities: separate validateInputs, setupSkill, doSkill (all doSkills should be idempotent)
//    - this.state.itemToSmelt instead of this.itemToSmelt
//    - charts of how idempotent flows work and make doSkill read like a book
//    - centralize resolves always to clear this.state?
// - At the least, make craft-items methods a little more atomic like in this skill

export class SmeltItems extends Skill {
  public static readonly TIMEOUT_MS: number = 50000; // 60 seconds
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

  private activeSubskill?: PathfindToCoordinates | PlaceBlock;
  private shouldBeDoingStuff: boolean = false;
  private shouldTerminateSubskillWaiting: boolean = false;

  private itemToSmelt?: ItemEntity;
  private quantityToSmelt?: number;

  private fuelItem?: ItemEntity;
  private necessaryFuelItemQuantity?: number;

  private expectedResultItem?: ItemEntity;
  private expectedResultItemQuantity?: number;

  private quantityInInventoryBeforeSmelting?: number;
  private furnaceWithItems?: PBlock;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private get itemDifferentialSinceInvoke(): number {
    assert(this.expectedResultItem);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);
    const quantityInInventory =
      this.expectedResultItem.getTotalCountInInventory();
    return quantityInInventory - this.quantityInInventoryBeforeSmelting;
  }

  private hasAcquiredExpectedResult(): boolean {
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);
    const quantityInInventory =
      this.expectedResultItem.getTotalCountInInventory();
    return quantityInInventory >= this.expectedResultItemQuantity;
  }

  private async resolveAfterSmelting(): Promise<void> {
    this.shouldBeDoingStuff = false;
  }

  private async withdrawAllItemsFromFurnace(furnace: PBlock): Promise<void> {
    assert(isWithinInteractionReach(this.bot, furnace.position));
    const furnaceObj = await this.bot.openFurnace(furnace);
    await furnaceObj.takeFuel();
    await furnaceObj.takeInput();
    await furnaceObj.takeOutput();
    if (this.bot.currentWindow) {
      this.bot.closeWindow(this.bot.currentWindow);
    }
  }

  private async putItemsIntoFurnace(furnace: PBlock): Promise<void> {
    assert(isWithinInteractionReach(this.bot, furnace.position));
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.necessaryFuelItemQuantity);
    const furnaceObj = await this.bot.openFurnace(furnace);
    await furnaceObj.putFuel(
      this.fuelItem.id,
      null,
      this.necessaryFuelItemQuantity
    );
    await furnaceObj.putInput(this.itemToSmelt.id, null, this.quantityToSmelt);
    this.furnaceWithItems = furnace;
    if (this.bot.currentWindow) {
      this.bot.closeWindow(this.bot.currentWindow);
    }
  }

  private async waitForSmeltingToFinish(): Promise<void> {
    assert(this.furnaceWithItems);
    assert(isWithinInteractionReach(this.bot, this.furnaceWithItems.position));
    const furnaceObj = await this.bot.openFurnace(this.furnaceWithItems);
    while (furnaceObj.fuel > 0) {
      await asyncSleep(100);
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }
    }
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
      handlePathfindingResolution.bind(this)
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
        furnaceCoords
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
      handlePlaceFurnaceResolution.bind(this)
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
        placeFurnaceResult
      );
      this.resolve(result);
      return;
    }
  }

  private async startOrResumeSmelting(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);

    if (this.hasAcquiredExpectedResult()) {
      // We likely got here from resuming after a pause that occured while awaiting
      // this.withdrawAllItemsFromFurnace() (which put the results into the inventory)
      this.resolveAfterSmelting();
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
          new SmeltItemsResults.FurnaceNoLongerInImmediateSurroundings()
        );
        return;
      }

      // Place a furnace if none in immediate surroundings
      if (!nearestImmediateSurroundingsFurnaceCoords && furnaceIsInInventory) {
        this.placeFurnace();
        if (!this.shouldBeDoingStuff) {
          return; // Exit on pause or stop
        }
        nearestImmediateSurroundingsFurnaceCoords =
          furnaceBlockType.locateNearestInImmediateSurroundings();
      }
      assert(nearestImmediateSurroundingsFurnaceCoords); // Should always be set by now

      // Pathfind to the furnace if not reachable
      await this.pathfindToFurnaceIfNeeded(
        nearestImmediateSurroundingsFurnaceCoords
      );
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }

      // Input items into the furnace
      const furnace = this.bot.blockAt(
        nearestImmediateSurroundingsFurnaceCoords
      );
      assert(furnace);
      await this.withdrawAllItemsFromFurnace(furnace);
      if (!this.shouldBeDoingStuff) {
        return; // Exit on pause or stop
      }
      await this.putItemsIntoFurnace(furnace);
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
    this.resolveAfterSmelting();
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    item: string | ItemEntity,
    withFuelItem: string | ItemEntity,
    quantityToSmelt: number = 1
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
    const isSmeltable: boolean = true; // TODO
    if (!isSmeltable) {
      this.resolve(
        new SmeltItemsResults.NonSmeltableItem(this.itemToSmelt.name)
      );
      return;
    }

    // Check if the fuel item is usable as fuel
    const isUsableAsFuel = true; // TODO
    if (!isUsableAsFuel) {
      this.resolve(
        new SmeltItemsResults.FuelItemNotUsableAsFuel(this.fuelItem.name)
      );
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
        new SmeltItemsResults.NoFurnaceAvailable(this.itemToSmelt.name)
      );
      return;
    }

    // Check if we have enough of the item to smelt
    const itemCount = this.itemToSmelt.getTotalCountInInventory();
    if (itemCount < quantityToSmelt) {
      this.resolve(
        new SmeltItemsResults.InsufficientSmeltItems(
          quantityToSmelt,
          this.itemToSmelt.name
        )
      );
      return;
    }

    // Check if we have enough fuel
    const hasSufficientFuel = true; // TODO
    if (!hasSufficientFuel) {
      this.resolve(
        new SmeltItemsResults.InsufficientFuel(
          this.fuelItem,
          this.itemToSmelt.name
        )
      );
      return;
    }

    this.quantityToSmelt = quantityToSmelt;
    this.quantityInInventoryBeforeSmelting =
      this.itemToSmelt.getTotalCountInInventory();
    this.furnaceWithItems = undefined;
    this.shouldBeDoingStuff = true;
    this.startOrResumeSmelting();
  }

  public async doPause(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.necessaryFuelItemQuantity);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = false;
    if (this.activeSubskill) {
      await this.activeSubskill.pause();
    }
  }

  public async doResume(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.necessaryFuelItemQuantity);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = true;
    if (this.activeSubskill) {
      // TODO: Comment
      await this.activeSubskill.resume();
    } else {
      // TODO: Comment
      this.startOrResumeSmelting();
    }
  }

  public async doStop(): Promise<void> {
    assert(this.itemToSmelt);
    assert(this.quantityToSmelt);
    assert(this.fuelItem);
    assert(this.necessaryFuelItemQuantity);
    assert(this.expectedResultItem);
    assert(this.expectedResultItemQuantity);
    assert(this.quantityInInventoryBeforeSmelting !== undefined);
    this.shouldBeDoingStuff = false;
    this.shouldTerminateSubskillWaiting = true;
    if (this.activeSubskill) {
      await this.activeSubskill.stop();
    }
  }
}

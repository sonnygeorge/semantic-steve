import assert from "assert";
import { Bot } from "mineflayer";
import type { Recipe } from "prismarine-recipe";
import { Block as PBlock } from "prismarine-block";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { CraftItemsResults } from "./results";
import { ItemType, BlockType } from "../../thing-type";
import { InvalidThingError, SkillResult } from "../../types";
import { PathfindToCoordinates } from "../pathfind-to-coordinates/pathfind-to-coordinates";
import { PlaceBlock } from "../place-block/place-block";
import { MineBlocks } from "../mine-blocks/mine-blocks";
import { asyncSleep } from "../../utils/generic";
import {
  BOT_EYE_HEIGHT,
  CRAFTING_WAIT_MS,
  MAX_PLACEMENT_REACH,
} from "../../constants";
import { PlaceBlockResults } from "../place-block/results";
import { MineBlocksResults } from "../mine-blocks/results";

// TODO: Resolve w/ a failure result if there is no space in the inventory for the crafted
// items to be received in the inventory.

export class CraftItems extends Skill {
  public static readonly TIMEOUT_MS: number = 19000; // 19 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "craftItems",
    signature: "craftItems(item: string, quantity: number = 1)",
    docstring: `
        /**
         * Crafts one or more of an item, assuming a crafting table (if necessary for the
         * recipe) is either in inventory or in the immediate surroundings.
         * @param item - The item to craft.
         * @param quantity - Optional quantity to craft. Defaults to 1.
         */
      `,
  };

  private activeSubskill?: PathfindToCoordinates | PlaceBlock | MineBlocks;
  private shouldBeDoingStuff: boolean = false;
  private shouldTerminateSubskillWaiting: boolean = false;
  private itemToCraft?: ItemType;
  private quantityToCraft?: number;
  private selectedRecipe?: Recipe;
  private quantityInInventoryBeforeCrafting?: number;
  private useCraftingTable?: boolean;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private get itemDifferentialSinceInvoke(): number {
    assert(this.itemToCraft);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    const quantityInInventory = this.itemToCraft.getTotalCountInInventory();
    return quantityInInventory - this.quantityInInventoryBeforeCrafting;
  }

  private async botCraft(table?: PBlock): Promise<void> {
    assert(this.itemToCraft);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    assert(this.selectedRecipe);
    assert(this.quantityToCraft);
    assert(this.useCraftingTable !== undefined);

    if (!this.shouldBeDoingStuff) {
      // Exit on pause or stop
      return;
    }
    const quantityOfRecipe =
      this.quantityToCraft / this.selectedRecipe.result.count;

    await this.bot.craft(this.selectedRecipe, quantityOfRecipe, table);
    if (!this.shouldBeDoingStuff) {
      // Exit on pause or stop
      return;
    }
    while (this.itemDifferentialSinceInvoke < this.quantityToCraft) {
      // Wait for the items to register as being in the bot's inventory
      await asyncSleep(CRAFTING_WAIT_MS);
      if (!this.shouldBeDoingStuff) {
        // Exit on pause or stop
        return;
      }
    }
  }

  private async startOrResumeCrafting(): Promise<void> {
    assert(this.itemToCraft);
    assert(this.quantityToCraft);
    assert(this.selectedRecipe);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    assert(this.useCraftingTable !== undefined);

    if (this.itemDifferentialSinceInvoke >= this.quantityToCraft) {
      // We've acquired the expected amount of the item to craft...
      // ...almost certainly from a pause that occured while awaiting bot.craft,
      // or asyncSleep(CRAFTING_WAIT_MS), causing this.shouldBeCrafting to be set to false,
      // false, and preventing resolution, which is why, after resume, we end up here.
      this.shouldBeDoingStuff = false;
      const result = new CraftItemsResults.Success(
        this.itemToCraft.name,
        this.quantityToCraft
      );
      this.resolve(result);
      return;
    }

    if (!this.useCraftingTable) {
      await this.botCraft();
      if (!this.shouldBeDoingStuff) {
        // Exit on pause or stop
        return;
      }
      const result = new CraftItemsResults.Success(
        this.itemToCraft.name,
        this.quantityToCraft
      );
      this.resolve(result);
      return;
    }

    // Crafting table case
    assert(this.useCraftingTable);
    const craftingTableBlockType = new BlockType(this.bot, "crafting_table");
    const craftingTableItemType = new ItemType(this.bot, "crafting_table");
    const craftingTableIsInInventory =
      craftingTableItemType.getTotalCountInInventory() > 0;
    let nearestImmediateSurroundingsTableCoords =
      craftingTableBlockType.locateNearestInImmediateSurroundings();

    if (
      !nearestImmediateSurroundingsTableCoords &&
      !craftingTableIsInInventory
    ) {
      // The only reason this could happen is if, during a pause, the bot moved away
      // from the crafting table that this skill placed (removing it from the inventory)
      this.shouldBeDoingStuff = false;
      this.resolve(
        new CraftItemsResults.TableNoLongerInImmediateSurroundings()
      );
      return;
    }
    // Place the crafting table if necessary
    if (
      !nearestImmediateSurroundingsTableCoords &&
      craftingTableIsInInventory
    ) {
      let placeCraftingTableResult: SkillResult | undefined = undefined;

      const handlePlaceCraftingTableResolution = (result: SkillResult) => {
        this.activeSubskill = undefined;
        placeCraftingTableResult = result;
      };

      this.activeSubskill = new PlaceBlock(
        this.bot,
        handlePlaceCraftingTableResolution.bind(this)
      );
      await this.activeSubskill.invoke(craftingTableBlockType);
      while (
        placeCraftingTableResult === undefined ||
        this.shouldTerminateSubskillWaiting
      ) {
        await asyncSleep(50);
      }
      const wasSuccess =
        (placeCraftingTableResult as SkillResult) instanceof
        PlaceBlockResults.Success;

      if (!wasSuccess) {
        this.shouldBeDoingStuff = false;
        const result = new CraftItemsResults.CraftingTablePlacementFailed(
          placeCraftingTableResult
        );
        this.resolve(result);
        return;
      }

      if (!this.shouldBeDoingStuff) {
        // Exit on pause or stop
        return;
      }
      nearestImmediateSurroundingsTableCoords =
        craftingTableBlockType.locateNearestInImmediateSurroundings();
    }

    assert(nearestImmediateSurroundingsTableCoords); // Should always be set by now

    const tableIsReachable = () => {
      const eyePosition = this.bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
      nearestImmediateSurroundingsTableCoords =
        craftingTableBlockType.locateNearestInImmediateSurroundings();
      assert(nearestImmediateSurroundingsTableCoords);
      const distanceToCraftingTable = eyePosition.distanceTo(
        nearestImmediateSurroundingsTableCoords
      );
      return distanceToCraftingTable <= MAX_PLACEMENT_REACH;
    };

    if (!tableIsReachable()) {
      // Pathfind to the crafting table
      let tableIsInRangeAfterPathfinding: boolean | undefined = undefined;

      const handlePathfindingResolution = (result: SkillResult) => {
        this.activeSubskill = undefined;
        tableIsInRangeAfterPathfinding = tableIsReachable();
      };

      this.activeSubskill = new PathfindToCoordinates(
        this.bot,
        handlePathfindingResolution.bind(this)
      );
      await this.activeSubskill.invoke(nearestImmediateSurroundingsTableCoords);
      while (
        tableIsInRangeAfterPathfinding === undefined ||
        this.shouldTerminateSubskillWaiting
      ) {
        await asyncSleep(50);
      }
      if (!tableIsInRangeAfterPathfinding) {
        this.shouldBeDoingStuff = false;
        const result = new CraftItemsResults.FailedToGetCloseEnoughToTable(
          nearestImmediateSurroundingsTableCoords
        );
        this.resolve(result);
        return;
      }

      if (!this.shouldBeDoingStuff) {
        // Exit on pause or stop
        return;
      }
    }

    assert(tableIsReachable());

    // Finally, we craft the item
    const table = this.bot.blockAt(nearestImmediateSurroundingsTableCoords);
    assert(table);
    await this.botCraft(table);

    // Always collect the crafting table after crafting
    const handleMineBlocksResolution = (mineBlocksResult: SkillResult) => {
      this.activeSubskill = undefined;
      assert(this.itemToCraft);
      assert(this.quantityToCraft);
      this.shouldBeDoingStuff = false;
      let craftItemsResult = new CraftItemsResults.Success(
        this.itemToCraft.name,
        this.quantityToCraft
      );
      if (!(mineBlocksResult instanceof MineBlocksResults.Success)) {
        craftItemsResult =
          new CraftItemsResults.SuccessProblemCollectingCraftingTable(
            this.itemToCraft.name,
            this.quantityToCraft,
            mineBlocksResult
          );
      }
      this.resolve(craftItemsResult);
    };

    this.activeSubskill = new MineBlocks(
      this.bot,
      handleMineBlocksResolution.bind(this)
    );
    await this.activeSubskill.invoke(craftingTableBlockType.name);

    while (this.activeSubskill) {
      await asyncSleep(50);
      if (this.shouldTerminateSubskillWaiting) {
        const result =
          new CraftItemsResults.SuccessProblemCollectingCraftingTable(
            this.itemToCraft.name,
            this.quantityToCraft
          );
        this.resolve(result);
        return;
      }
    }
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    item: string | ItemType,
    quantity: number = 1
  ): Promise<void> {
    if (typeof item === "string") {
      // Validate the item string
      try {
        this.itemToCraft = new ItemType(this.bot, item);
      } catch (err) {
        if (err instanceof InvalidThingError) {
          const result = new CraftItemsResults.InvalidItem(item);
          this.resolve(result);
          return;
        } else {
          throw err;
        }
      }
    } else {
      this.itemToCraft = item;
    }
    assert(this.itemToCraft); // TS compiler doesn't know this despite always being true

    const tableRecipes = this.bot.recipesAll(this.itemToCraft.id, null, true);
    const nonTableRecipes = this.bot.recipesAll(
      this.itemToCraft.id,
      null,
      false
    );
    const allRecipes = tableRecipes.concat(nonTableRecipes);

    // Check if the item is craftable generally (any recipes exist)
    if (allRecipes.length === 0) {
      this.resolve(
        new CraftItemsResults.NonCraftableItem(this.itemToCraft.name)
      );
      return;
    }

    // Check if the item requires a crafting table but none are available
    const craftingTableIsAvailable = () => {
      const craftingTableItemType = new ItemType(this.bot, "crafting_table");
      const craftingTableBlockType = new BlockType(this.bot, "crafting_table");
      return (
        craftingTableBlockType.isVisibleInImmediateSurroundings() ||
        craftingTableItemType.getTotalCountInInventory() > 0
      );
    };

    const requiresCraftingTable = nonTableRecipes.length === 0;
    if (requiresCraftingTable && !craftingTableIsAvailable()) {
      this.resolve(
        new CraftItemsResults.NoCraftingTable(this.itemToCraft.name)
      );
      return;
    }

    // Get feasible recipes for out desired minimum quantity
    const recipes = this.bot.recipesFor(
      this.itemToCraft.id,
      null,
      quantity, // Minimum resulting quantity
      true // Set of non-table recipes is a subset of the set of table recipes
    );

    let lastFeasibleNonTableRecipe: undefined | Recipe = undefined;
    let lastFeasibleTableRecipe: undefined | Recipe = undefined;
    for (const recipe of recipes) {
      // NOTE: this.bot.recipesFor() only returns recipes:
      // 1. that produce at least the requested quantity of items
      // 2. for which the bot has sufficient ingredients
      const isFeasibleNonTableRecipe = !recipe.requiresTable;
      const isFeasibleTableRecipe =
        recipe.requiresTable && craftingTableIsAvailable();
      if (isFeasibleNonTableRecipe) {
        lastFeasibleNonTableRecipe = recipe;
      }
      if (isFeasibleTableRecipe) {
        lastFeasibleTableRecipe = recipe;
      }
    }

    // Select the recipe (preferring to not use a crafting table if not required)
    if (lastFeasibleNonTableRecipe) {
      this.selectedRecipe = lastFeasibleNonTableRecipe;
      this.useCraftingTable = false;
    } else if (lastFeasibleTableRecipe) {
      this.selectedRecipe = lastFeasibleTableRecipe;
      this.useCraftingTable = true;
    } else {
      // Since we already determined:
      // 1. that the item is craftable
      // 2. that we have a crafting table if needed
      // Therefore, the only reason recipesFor would return an empty array is if the bot
      // doesn't have the required ingredients in its inventory.
      this.resolve(
        new CraftItemsResults.InsufficientRecipeIngredients(
          this.itemToCraft.name,
          quantity
        )
      );
      return;
    }

    // NOTE: quantityToCraft can/should be larger than the requested quantity if a recipe
    // produces only multiples of the resulting item (e.g. 4 or 8) and the requested
    // quantity is not a multiple of that number.
    this.quantityToCraft =
      Math.ceil(quantity / this.selectedRecipe.result.count) *
      this.selectedRecipe.result.count;
    this.shouldBeDoingStuff = true;
    this.quantityInInventoryBeforeCrafting =
      this.itemToCraft.getTotalCountInInventory();
    this.startOrResumeCrafting();
  }

  public async doPause(): Promise<void> {
    assert(this.itemToCraft);
    assert(this.quantityToCraft);
    assert(this.selectedRecipe);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    assert(this.useCraftingTable !== undefined);
    this.shouldBeDoingStuff = false;
    if (this.activeSubskill) {
      await this.activeSubskill.pause();
    }
  }

  public async doResume(): Promise<void> {
    assert(this.itemToCraft);
    assert(this.quantityToCraft);
    assert(this.selectedRecipe);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    assert(this.useCraftingTable !== undefined);
    this.shouldBeDoingStuff = true;
    if (this.activeSubskill) {
      // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
      await this.activeSubskill.resume();
    } else {
      // TODO: Explanatory comment (for now, see the analogous comment in mine-blocks.ts)
      this.startOrResumeCrafting();
    }
  }

  public async doStop(): Promise<void> {
    assert(this.itemToCraft);
    assert(this.quantityToCraft);
    assert(this.selectedRecipe);
    assert(this.quantityInInventoryBeforeCrafting !== undefined);
    assert(this.useCraftingTable !== undefined);
    this.shouldBeDoingStuff = false;
    this.shouldTerminateSubskillWaiting = true;
    if (this.activeSubskill) {
      await this.activeSubskill.stop();
    }
  }
}

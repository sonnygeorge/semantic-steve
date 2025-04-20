import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import { Vec3 } from "vec3";
import { PlaceBlockResults } from "./results";
import { GetPlaceableCoordinatesResults } from "../get-placeable-coordinates/results";
import { Block } from "../../thing";
import { InvalidThingError, SkillResult } from "../../types";
import { Item as PItem } from "prismarine-item";
import { asyncSleep } from "../../utils/generic";
import {
  getPlaceableCoords,
  getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable,
} from "../../utils/placing";
import { BLOCK_PLACEMENT_WAIT_MS } from "../../constants";

export class PlaceBlock extends Skill {
  public static readonly TIMEOUT_MS: number = 4000; // 4 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "placeBlock",
    signature:
      "placeBlock(block: string, atCoordinates?: [number, number, number])",
    docstring: `
        /**
         * Places a block.
         *
         * @param block - The block to place.
         * @param atCoordinates - Optional target coordinates for block placement.
         */
      `,
  };

  private shouldBePlacing: boolean = false;
  private blockToPlace?: Block;
  private targetPosition?: Vec3;
  private itemToPlace?: PItem;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
  }

  private resolve(result: SkillResult): void {
    this.shouldBePlacing = false;
    this.blockToPlace = undefined;
    this.targetPosition = undefined;
    this.itemToPlace = undefined;
    this.onResolution(result);
  }

  private async doPlacing(): Promise<void> {
    assert(this.blockToPlace);
    assert(this.targetPosition);
    assert(this.itemToPlace);

    const referenceBlockAndFaceVector =
      getViableReferenceBlockAndFaceVectorIfCoordsArePlaceable(
        this.bot,
        this.targetPosition,
      );

    if (!referenceBlockAndFaceVector) {
      const result = new PlaceBlockResults.UnplaceableCoords(
        `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
      );
      this.resolve(result);
      return;
    }

    if (this.shouldBePlacing) {
      await this.bot.equip(this.itemToPlace, "hand");
    }

    if (this.shouldBePlacing) {
      await this.bot.placeBlock(
        referenceBlockAndFaceVector[0],
        referenceBlockAndFaceVector[1],
      );
    }

    // Wait for things to settle (e.g., gravel to fall)
    await asyncSleep(BLOCK_PLACEMENT_WAIT_MS);

    // If we got here, we know that, at invocation time, no block was at the target
    // coordinates. Therefore, we consider the correct block existing at the target
    // coordinates as a placement success.
    if (this.shouldBePlacing) {
      const blockAtTargetCoords = this.bot.blockAt(this.targetPosition);
      if (
        !blockAtTargetCoords ||
        blockAtTargetCoords.name !== this.blockToPlace.name
      ) {
        this.resolve(
          new PlaceBlockResults.PlacingFailure(
            this.blockToPlace.name,
            `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
          ),
        );
      } else {
        this.resolve(
          new PlaceBlockResults.Success(
            this.blockToPlace.name,
            `${this.targetPosition.x}, ${this.targetPosition.y}, ${this.targetPosition.z}`,
          ),
        );
      }
    }
  }

  public async invoke(
    block: string,
    atCoordinates?: [number, number, number],
  ): Promise<void> {
    try {
      this.blockToPlace = new Block(this.bot, block);
    } catch (err) {
      if (err instanceof InvalidThingError) {
        this.resolve(new PlaceBlockResults.InvalidBlock(block));
        return;
      }
      throw err;
    }

    this.itemToPlace = this.bot.inventory.items().find((item) => {
      // This assert is obviously true (above), but TS compiler doesn't know this
      assert(this.blockToPlace !== undefined);
      return item.name === this.blockToPlace.name;
    });

    if (!this.itemToPlace) {
      this.resolve(new PlaceBlockResults.BlockNotInInventory(block));
      return;
    }

    if (!atCoordinates) {
      this.targetPosition = getPlaceableCoords(this.bot);
      if (!this.targetPosition) {
        this.resolve(new GetPlaceableCoordinatesResults.NoPlaceableCoords());
        return;
      }
    } else {
      this.targetPosition = new Vec3(
        atCoordinates[0],
        atCoordinates[1],
        atCoordinates[2],
      );
    }

    this.shouldBePlacing = true;
    await this.doPlacing();
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${PlaceBlock.METADATA.name}'`);
    this.shouldBePlacing = false;
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${PlaceBlock.METADATA.name}'`);
    assert(this.blockToPlace);
    assert(this.targetPosition);
    assert(this.itemToPlace);
    this.shouldBePlacing = true;
    await this.doPlacing();
  }
}

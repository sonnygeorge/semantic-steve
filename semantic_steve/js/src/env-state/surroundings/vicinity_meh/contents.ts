import assert from "assert";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block as PBlock } from "prismarine-block";
import { BlocksCache } from "../cache";
import { AVLTree } from "avl";
import { ItemEntityWithData } from "../../../types";
import { classifyVicinityOfPosition } from "./classify";
import { VicinityName } from "../vicinity/enums";
import { serializeVec3 } from "../../../utils/generic";

export class VicinityContents {
  private bot: Bot;
  private name: VicinityName;
  private immediateSurroundingsRadius: number;
  private distantSurroundingsRadius: number;
  public blocks: Map<string, PBlock> = new Map();
  public items: Map<string, ItemEntityWithData> = new Map();
  public visible: VisibleContents;

  constructor(
    bot: Bot,
    name: VicinityName,
    immediateSurroundingsRadius: number,
    distantSurroundingsRadius: number
  ) {
    this.bot = bot;
    this.name = name;
    this.immediateSurroundingsRadius = immediateSurroundingsRadius;
    this.distantSurroundingsRadius = distantSurroundingsRadius;
    this.visible = new VisibleContents(bot, this);
  }

  public addBlockIfInVicinity(block: PBlock): boolean {
    // This function has its own caching layer so redundant calls are implicitly avoided.
    const vicinityOfBlock = classifyVicinityOfPosition(
      block.position,
      this.bot,
      this.immediateSurroundingsRadius,
      this.distantSurroundingsRadius
    );
    if (vicinityOfBlock !== this.name) {
      return false; // Block is not in this vicinity
    }
    const key = serializeVec3(block.position);
    this.blocks.set(key, block);
    return true; // Block added successfully
  }
}

export class VisibleContents {
  private bot: Bot;
  private vicinityContents: VicinityContents;

  constructor(bot: Bot, vicinityContents: VicinityContents) {
    this.bot = bot;
    this.vicinityContents = vicinityContents;
  }

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

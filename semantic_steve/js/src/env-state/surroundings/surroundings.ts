import assert from "assert";
import { Vec3 } from "vec3";
import { Bot } from "mineflayer";
import { Block as PBlock } from "prismarine-block";
import { Entity as PEntity } from "prismarine-entity";
import {
  Direction,
  Vicinity,
  classifyVicinityOfPosition,
  VisibleVicinityContents,
} from "./vicinity";
import { AllLoadedBlocksCache, AllSpawnedItemEntitiesCache } from "./cache";
import { applyFuncToCoordsInChunk } from "../../utils/chunk";
import {
  isBlockVisible,
  areContentsOfCoordsVisible,
} from "../../utils/visibility";
import { ensureItemData } from "../../utils/item-entity";
import { ItemEntityWithData } from "../../types";
import { getAllCoordsWithinRadiusToBot } from "../../utils/misc";

export const BLOCKS_TO_IGNORE: string[] = ["air"];

//========================
// Immediate Surroundings
//========================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `ImmediateSurroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type ImmediateSurroundingsDTO = {
  visibleBlocks: { [key: string]: [number, number, number][] };
  visibleBiomes: string[];
  visibleItems: { [key: string]: [number, number, number][] };
};

/**
 * Full-detail data structure/object (used internally) that represents the VISIBLE contents
 * of the bot's immediate surroundings.
 */
export class ImmediateSurroundings extends VisibleVicinityContents {
  getDTO(): ImmediateSurroundingsDTO {
    const visibleBlocks: { [key: string]: [number, number, number][] } = {};
    for (const [blockName, coordsIterable] of this.getBlockNamesToAllCoords()) {
      visibleBlocks[blockName] = Array.from(coordsIterable).map(
        (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
      );
    }

    const visibleItems: { [key: string]: [number, number, number][] } = {};
    for (const [itemName, coordsIterable] of this.getItemNamesToAllCoords()) {
      visibleItems[itemName] = Array.from(coordsIterable).map(
        (vec3) => [vec3.x, vec3.y, vec3.z] as [number, number, number]
      );
    }

    return {
      visibleBlocks: visibleBlocks,
      visibleBiomes: Array.from(this.getDistinctBiomeNames()),
      visibleItems: visibleItems,
    };
  }
}

//=====================================
// Distant surroundings in a direction
//=====================================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `DistantSurroundingsInADirection`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type DistantSurroundingsInADirectionDTO = {
  visibleBlockCounts: { [key: string]: number };
  visibleBiomes: string[];
  visibleItemCounts: { [key: string]: number };
};

/**
 * Full-detail data structure/object (used internally) that represents the VISIBLE contents
 * of the bot's distant surroundings in a specific direction.
 */
export class DistantSurroundingsInADirection extends VisibleVicinityContents {
  getDTO(): DistantSurroundingsInADirectionDTO {
    return {
      visibleBlockCounts: Object.fromEntries(this.blockNamesToCounts),
      visibleBiomes: Array.from(this.getDistinctBiomeNames()),
      visibleItemCounts: Object.fromEntries(this.itemEntityNamesToCounts),
    };
  }
}

//======================
// Distant surroundings
//======================

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `DistantSurroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want  the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type DistantSurroundingsDTO = {
  [key: string]: DistantSurroundingsInADirectionDTO;
};

/**
 * Full-detail data structure (used internally) that represents the VISIBLE contents of
 * the bot's distant surroundings (in all directions).
 */
export type DistantSurroundings = Map<
  Direction,
  DistantSurroundingsInADirection
>;

//==============
// Surroundings
//==============

/**
 * The radii that parameterize the geometry of the `Vicinity`s of the bot's surroundings.
 */
export type SurroundingsRadii = {
  immediateSurroundingsRadius: number;
  distantSurroundingsRadius: number;
};

/**
 * Lower-detail "Data Transfer Object" (DTO) version of `Surroundings`.
 *
 * Unlike its full-detail counterpart, this DTO contains only the information that we want
 * to send to the Python client (i.e., that we want the LLM to see).
 *
 * Crucially, only JSON-serializable types are used in this DTO (e.g., no `Vec3` objects).
 */
export type SurroundingsDTO = {
  immediateSurroundings: ImmediateSurroundingsDTO;
  distantSurroundings: DistantSurroundingsDTO;
};

/**
 * Object that continually listens/caches/handles and exposes eagerly-loaded/handled
 * surroundings data
 */
export class Surroundings {
  private bot: Bot;
  private allLoadedBlocks: AllLoadedBlocksCache;
  private allSpawnedItemEntities: AllSpawnedItemEntitiesCache;
  private entitesGoneBeforeCacheAdd = new Set<string>(); // Defensive programming (probably not needed)
  private lastBotPosition: Vec3; // For calculating size of movements in handleBotMovement
  public getVicinityForPosition: (pos: Vec3) => Vicinity | undefined;
  radii: SurroundingsRadii;
  immediate: ImmediateSurroundings;
  distant: DistantSurroundings;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    // Private
    this.bot = bot;
    this.allLoadedBlocks = new AllLoadedBlocksCache(bot);
    this.allSpawnedItemEntities = new AllSpawnedItemEntitiesCache(bot);
    this.lastBotPosition = bot.entity.position.clone();
    this.getVicinityForPosition = classifyVicinityOfPosition.bind(
      this,
      bot,
      radii.immediateSurroundingsRadius,
      radii.distantSurroundingsRadius
    );
    // Public
    this.radii = radii;
    this.immediate = new ImmediateSurroundings(bot);
    this.distant = new Map(
      Object.values(Direction).map((dir) => [
        dir,
        new DistantSurroundingsInADirection(bot),
      ])
    );

    this.setupEventListeners();
  }

  // ===========
  // DTO getter
  // ===========

  getDTO(): SurroundingsDTO {
    return {
      immediateSurroundings: this.immediate.getDTO(),
      distantSurroundings: Object.fromEntries(
        [...this.distant.entries()].map(([dir, ds]) => [dir, ds.getDTO()])
      ),
    };
  }

  // ================
  // Listeners setup
  // ================

  private setupEventListeners(): void {
    // Set up listeners to monitor and eagerly handle PBlock loads, unloads, and updates.
    // NOTE: It is from PBlock data that we glean the BlockType and BiomeType info.
    this.bot.world.on("chunkColumnLoad", this.handleChunkLoad.bind(this));
    this.bot.world.on("chunkColumnUnload", this.handleChunkUnload.bind(this));
    this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
    // Set up listeners to monitor and eagerly handle PEntity spawns, despawns, and movements.
    this.bot.on("entitySpawn", this.handleEntitySpawn.bind(this));
    this.bot.on("entityGone", this.handleEntityGone.bind(this));
    this.bot.on("entityMoved", this.handleEntityMoved.bind(this));
    // Set up listeners to monitor and eagerly handle bot movements.
    this.bot.on("move", this.handleBotMovement.bind(this));
  }

  // ===============
  // Helpers: block
  // ===============

  private classifyAndAddBlockToVicinityIfIsVisibleInOne(block: PBlock): void {
    const vicinity = this.getVicinityForPosition(block.position);
    if (!vicinity || !isBlockVisible(this.bot, block, block.position)) {
      // Not in any vicinity or not visible, so do nothing
    } else if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      this.immediate.addBlock(block);
    } else {
      const direction = vicinity as unknown as Direction;
      this.distant.get(direction)?.addBlock(block);
    }
  }

  private removeBlockFromVicinityIfWasVisibleInOne(block: PBlock): void {
    const posKey = AllLoadedBlocksCache.getKeyFromVec3(block.position);
    if (this.immediate.blocksLookup.has(posKey)) {
      this.immediate.removeBlock(block);
    } else {
      for (const distantSurroundingsInDir of this.distant.values()) {
        if (distantSurroundingsInDir.blocksLookup.has(posKey)) {
          distantSurroundingsInDir.removeBlock(block);
          break; // Done checking distant surroundings directions
        }
      }
    }
  }

  private processNewlyLoadedBlock(block: PBlock | Vec3 | null): void {
    if (block instanceof Vec3) {
      block = this.bot.blockAt(block);
    }
    // Ignore blocks that we are not interested in
    if (!block || BLOCKS_TO_IGNORE.includes(block.name)) return;
    // 1. Add to cache of all loaded blocks
    this.allLoadedBlocks.set(
      AllLoadedBlocksCache.getKeyFromVec3(block.position),
      block
    );
    // 2. If in a vicinity and visible, add to that vicinity
    this.classifyAndAddBlockToVicinityIfIsVisibleInOne(block);
  }

  private processRemovalOfOldBlock(block: PBlock | Vec3): void {
    const posKey = AllLoadedBlocksCache.getKeyFromVec3(
      block instanceof Vec3 ? block : block?.position
    );
    const storedBlock = this.allLoadedBlocks.get(posKey);
    if (!storedBlock) {
      // Block never stored in the first place, e.g., was in BLOCKS_TO_IGNORE
      return;
    }
    this.allLoadedBlocks.delete(posKey);
    this.removeBlockFromVicinityIfWasVisibleInOne(storedBlock);
  }

  // ==============
  // Helpers: item
  // ==============

  private classifyAndAddItemToVicinityIfIsVisibleInOne(
    itemEntityWithData: ItemEntityWithData
  ): void {
    assert(itemEntityWithData.entity.name === "item");
    assert(itemEntityWithData.entity.uuid);
    const vicinity = this.getVicinityForPosition(
      itemEntityWithData.entity.position
    );
    if (
      !vicinity ||
      !areContentsOfCoordsVisible(this.bot, itemEntityWithData.entity.position)
    ) {
      // Not in any vicinity or not visible, so do nothing
    } else if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
      this.immediate.addItem(itemEntityWithData);
    } else {
      const direction = vicinity as unknown as Direction;
      this.distant.get(direction)?.addItem(itemEntityWithData);
    }
  }

  private removeItemFromVicinityIfWasVisibleInOne(
    itemEntityWithData: ItemEntityWithData
  ): void {
    assert(itemEntityWithData.entity.name === "item");
    assert(itemEntityWithData.entity.uuid);
    const uuid = itemEntityWithData.entity.uuid;
    if (this.immediate.itemsLookup.has(uuid)) {
      this.immediate.removeItem(itemEntityWithData);
    } else {
      for (const distantSurroundingsInDir of this.distant.values()) {
        if (distantSurroundingsInDir.itemsLookup.has(uuid)) {
          distantSurroundingsInDir.removeItem(itemEntityWithData);
          break; // Done checking distant surroundings directions
        }
      }
    }
  }

  private async processNewlySpawnedItemEntity(
    itemEntityWithData: ItemEntityWithData
  ): Promise<void> {
    assert(itemEntityWithData.entity.name === "item");
    this.allSpawnedItemEntities.set(
      itemEntityWithData.entity.uuid!,
      itemEntityWithData
    );
    this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
  }

  private async processRemovalOfGoneItemEntity(
    itemEntityWithData: ItemEntityWithData
  ): Promise<void> {
    assert(PEntity.name === "item");
    assert(itemEntityWithData.entity.uuid);
    this.allSpawnedItemEntities.delete(itemEntityWithData.entity.uuid!);
    this.removeItemFromVicinityIfWasVisibleInOne(itemEntityWithData);
  }

  // ===============
  // Event handlers
  // ===============

  private handleChunkLoad(chunkPos: Vec3): void {
    // console log chunk's horizontal distance from bot
    const botPos = this.bot.entity.position;
    const xyDistanceToBot = Math.sqrt(
      Math.pow(chunkPos.x - botPos.x, 2) + Math.pow(chunkPos.z - botPos.z, 2)
    );
    // console.log(
    //   `Chunk at ${chunkPos} is ${xyDistanceToBot.toFixed(
    //     2
    //   )} blocks away from the bot.`
    // );
    console.log(`Size of allLoadedBlocks: ${this.allLoadedBlocks.size}`);
    applyFuncToCoordsInChunk(
      this.bot,
      this.processNewlyLoadedBlock.bind(this),
      chunkPos
    );
  }

  private handleChunkUnload(chunkPos: Vec3): void {
    applyFuncToCoordsInChunk(
      this.bot,
      this.processRemovalOfOldBlock.bind(this),
      chunkPos
    );
  }

  private handleBlockUpdate(
    oldBlock: PBlock | null,
    newBlock: PBlock | null
  ): void {
    if (oldBlock) {
      this.processRemovalOfOldBlock(oldBlock);
    }
    if (newBlock) {
      this.processNewlyLoadedBlock(newBlock);
    }
  }

  private async handleEntitySpawn(entity: PEntity): Promise<void> {
    if (entity.name === "item") {
      // Ensure the loading of its uuid and PItem data
      const itemEntityWithData = await ensureItemData(this.bot, entity);
      // Defensive programming: If the entityGone somehow already happened before getting here...
      if (this.entitesGoneBeforeCacheAdd.has(itemEntityWithData.entity.uuid!)) {
        return; // Don't process this as a newly spawned item entity
      } else {
        this.processNewlySpawnedItemEntity(itemEntityWithData);
      }
    }
  }

  private async handleEntityGone(entity: PEntity): Promise<void> {
    if (entity.name === "item") {
      // Ensure the loading of its uuid and PItem data
      const itemEntityWithData = await ensureItemData(this.bot, entity);
      // Defensive programming: If entityGone somehow happened before processing the spawn event...
      if (!this.allSpawnedItemEntities.has(itemEntityWithData.entity.uuid!)) {
        // Any spawned item entity with a UUID should have already been added to this cache...
        // HOWEVER, on the off chance the event loop gets here before adding the entity...
        // (which I don't *think* is possible/realistic?, but better safe than sorry!),
        // let's prevent this UUID from ever being added if the event loop does try to do so later.
        this.entitesGoneBeforeCacheAdd.add(itemEntityWithData.entity.uuid!);
      } else {
        this.processRemovalOfGoneItemEntity(itemEntityWithData);
      }
    }
  }

  private async handleEntityMoved(entity: PEntity): Promise<void> {
    if (entity.name === "item") {
      // Ensure the loading of its uuid and PItem data
      const itemEntityWithData = await ensureItemData(this.bot, entity);
      if (!this.allSpawnedItemEntities.has(itemEntityWithData.entity.uuid!)) {
        // Doing nothing here assumes that, by virtue of a weird event loop or event emission
        // timing issue, we got here before the entity was added to the cache, and, when
        // the new entity spawn occurs later, it will have an up-to-date position.
        return;
      } else {
        // The item should stay in the allSpawnedItemEntities cache (unlike with block updates,
        // where we want to replace the old PBlock @ the coordinates in the cache).
        // But, we do want to reclassify its visibility/vicinity and reinsert it back into the
        // distance-to-bot-sorted AVL trees.
        this.removeItemFromVicinityIfWasVisibleInOne(itemEntityWithData);
        this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
      }
    }
  }

  private handleBotMovement(): void {
    const newPosition = this.bot.entity.position;
    // Do nothing if magnitude of bot movement is negligible
    if (newPosition.equals(this.lastBotPosition)) return;
    if (newPosition.distanceTo(this.lastBotPosition) < 0.2) return;
    // Update last position
    this.lastBotPosition = newPosition.clone();

    // Now, we need reclassify the vicinity/visiblity of everything that could potentially
    // now be visible in the surroundings.

    // To do this, let's recreate new vicinity objects from scratch (allowing the AVL trees
    // to be rebuilt based on new distances to the bot).

    this.immediate = new ImmediateSurroundings(this.bot);
    this.distant = new Map(
      Object.values(Direction).map((dir) => [
        dir,
        new DistantSurroundingsInADirection(this.bot),
      ])
    );

    // For blocks, we only need to look at:
    // 1. What's in the distant surroundings radius.
    // 2. What's loaded (and not in BLOCKS_TO_IGNORE), i.e., what's in the cache.
    for (const coords of getAllCoordsWithinRadiusToBot(
      this.bot,
      this.radii.distantSurroundingsRadius
    )) {
      const block = this.allLoadedBlocks.get(
        AllLoadedBlocksCache.getKeyFromVec3(coords)
      );
      if (!block) continue; // Skip if not meeting above criteria #2
      this.classifyAndAddBlockToVicinityIfIsVisibleInOne(block);
    }

    // For entities, we reconsider all spawned entities (theory being, it should not be too many)
    for (const itemEntityWithData of this.allSpawnedItemEntities.values()) {
      this.classifyAndAddItemToVicinityIfIsVisibleInOne(itemEntityWithData);
    }
  }
}

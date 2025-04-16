import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { Block as PBlock } from "prismarine-block";
import type { world as PWorld } from "prismarine-world";
import type {Item as PItem} from 'prismarine-item'
import { _Surroundings, Direction, Vicinity, SurroundingsRadii } from "./types";
import { AABB } from "@nxg-org/mineflayer-util-plugin"; // TODO: Remove this dependency
import { Entity } from "prismarine-entity";

// NOTE: We don't care about (account for) variation from crouching, riding, etc.
export const BOT_EYE_HEIGHT = 1.62;
export const BLOCKS_TO_IGNORE: string[] = ["air"];


 /**
   * Calculates which `Vicinity` of the surroundings a set of coordinates are in (if any).
   *
   * For the purpose of describing the bot's surroundings in language, we partition the 3D
   * space around the bot into 11 "vicinities" where:
   *
   * 1. `IMMEDIATE_SURROUNDINGS`:
   *    - Is the space within an immediate sphere of radius `ImmediateSurroundingsRadius`.
   *
   * 2. `DISTANT_SURROUNDINGS_UP` and `DISTANT_SURROUNDINGS_DOWN`:
   *    - Are cylindrical columns extending up and down from the circumference of the
   *     IMMEDIATE_SURROUNDINGS sphere, but not extending beyond `DistantSurroundingsRadius`.
   *
   * 3. `DISTANT_SURROUNDINGS_{NORTH, NORTHEAST, EAST, SOUTHEAST, SOUTH, SOUTHWEST, WEST, NORTHWEST}`:
   *    - Partition the remaining space in a sphere of radius `DistantSurroundingsRadius` into
   *      8 "wedges".
   *
   *      (Hint: picture an apple sliced by that one apple slicer kitchen tool that gets
   *      pressed down onto an apple and creates apple wedges while remove a center column
   *      containing the apple core.)
   *
   *
   * Horizontal slice (i.e. "viewed from above") at current bot y-level:
   *
   *                       ooo OOO OOO ooo
   *                   oOO                 OOo
   *               oOO    \       N       /    OOo
   *            oOO        \             /        OOo
   *          oOO           \           /           OOo
   *        oOO     NW       \         /     NE       OOo
   *       oOO.               \       /               .OOo
   *      oOO  '--.__         ooooooooo         __.--'  OOo
   *     oOO         ''__   oo         oo   __''         OOo
   *     oOO             'oo             oo'             OOo
   *     oOO   W          o   IMMEDIATE   o         E    OOo
   *     oOO           __.oo             oo.__           OOo
   *     oOO    __.--''     oo         oo     ''--.__    OOo
   *      oOO -'              ooooooooo              '- OOo
   *       oOO                /       \                OOo
   *        oOO     SW       /         \       SE     OOo
   *          oOO           /           \            OOo
   *            oO         /             \         OOo
   *               oOO    /       S       \     OOo
   *                   oOO                 OOo
   *                       ooo OOO OOO ooo
   *
   *      |-----------------------| Distant Surrounding Radius
   *                     |--------| Immediate Surroundings Radius
   *
   *  Horizontal slice (i.e. "viewed from the side") at current bot x-level:
   *
   *                       ooo OOO OOO ooo
   *                   oOO                 OOo
   *               oOO   |                 |   OOo
   *            oOO      |       UP        |      OOo
   *          oOO        |                 |        OOo
   *        oOO          |                 |          OOo
   *       oOO           |                 |           OOo
   *      oOO            |    ooooooooo    |            OOo
   *     oOO             |  oo         oo  |             OOo
   *     oOO              oo             oo              OOo
   *     oOO   S          o   IMMEDIATE   o         N    OOo
   *     oOO              oo             oo              OOo
   *     oOO             |  oo         oo  |             OOo
   *      oOO            |    ooooooooo    |            OOo
   *       oOO           |                 |           OOo
   *        oOO          |                 |          OOo
   *          oOO        |                 |         OOo
   *            oO       |      DOWN       |       OOo
   *               oOO   |                 |    OOo
   *                   oOO                 OOo
   *                       ooo OOO OOO ooo
   *
   *      |-----------------------| Distant Surrounding Radius
   *                     |--------| Immediate Surroundings Radius
   *
   * ### Function Signature:
   *
   * @param {Vec3} coords - The coordinates to check.
   * @returns {[Vicinity | undefined, number]} - A tuple containing:
   *   1. The `Vicinity` the coordinates are in (or undefined if outside surroundings).
   *   2. The distance to the coordinates (in meters/blocks).
   */

export class SurroundingsHydrater {
  private bot: Bot;
  private radii: SurroundingsRadii;

  constructor(bot: Bot, radii: SurroundingsRadii) {
    this.bot = bot;
    this.radii = radii;
  }

  private areCoordsWithinSurroundings(coords: Vec3): boolean {
    return this.bot.entity.position.distanceTo(coords) <= this.radii.distantSurroundingsRadius;
  }

  private getVicinityAndDistanceOfCoords(coords: Vec3): [Vicinity | undefined, number] {
    const botCoords = this.bot.entity.position;
    const distanceToCoords = botCoords.distanceTo(coords);
    
    // Early returns for out of range or immediate vicinity
    if (distanceToCoords > this.radii.distantSurroundingsRadius) return [undefined, distanceToCoords];
    if (distanceToCoords <= this.radii.immediateSurroundingsRadius) return [Vicinity.IMMEDIATE_SURROUNDINGS, distanceToCoords];
    
    // Check for up/down directions
    const dxz = Math.sqrt((coords.x - botCoords.x) ** 2 + (coords.z - botCoords.z) ** 2);
    if (dxz <= this.radii.immediateSurroundingsRadius) {
      return [coords.y > botCoords.y ? Vicinity.DISTANT_SURROUNDINGS_UP : Vicinity.DISTANT_SURROUNDINGS_DOWN, distanceToCoords];
    }
    
    // Determine horizontal direction based on angle
    const angle = (Math.atan2(coords.x - botCoords.x, -coords.z + botCoords.z) * (180 / Math.PI) + 360) % 360;
    
    const directions = [
      [22.5, Vicinity.DISTANT_SURROUNDINGS_NORTH],
      [67.5, Vicinity.DISTANT_SURROUNDINGS_NORTHEAST],
      [112.5, Vicinity.DISTANT_SURROUNDINGS_EAST],
      [157.5, Vicinity.DISTANT_SURROUNDINGS_SOUTHEAST],
      [202.5, Vicinity.DISTANT_SURROUNDINGS_SOUTH],
      [247.5, Vicinity.DISTANT_SURROUNDINGS_SOUTHWEST],
      [292.5, Vicinity.DISTANT_SURROUNDINGS_WEST],
      [337.5, Vicinity.DISTANT_SURROUNDINGS_NORTHWEST],
      [360, Vicinity.DISTANT_SURROUNDINGS_NORTH]
    ] as const;
    
    for (const [threshold, direction] of directions) {
      if (angle < threshold) return [direction as Vicinity, distanceToCoords];
    }
    
    return [Vicinity.DISTANT_SURROUNDINGS_NORTH, distanceToCoords];
  }

  private isBlockVisible(block: PBlock, blockCoords: Vec3): boolean {
    // Check if block has exposed sides
    const offsets = [
      new Vec3(1, 0, 0), new Vec3(-1, 0, 0), 
      new Vec3(0, 1, 0), new Vec3(0, -1, 0), 
      new Vec3(0, 0, 1), new Vec3(0, 0, -1)
    ];
    
    // Check if at least one side is exposed
    let isExposed = false;
    for (const offset of offsets) {
      const blockAtOffset = this.bot.blockAt(blockCoords.plus(offset));
      if (!blockAtOffset || !blockAtOffset.shapes.some(s => 
        s[0] === 0 && s[3] === 1 && 
        s[1] === 0 && s[4] === 1 && 
        s[2] === 0 && s[5] === 1)) {
        isExposed = true;
        break;
      }
    }
    
    if (!isExposed) return false;
    
    // Raycast to check visibility
    const eyePosition = this.bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
    
    for (const shape of block.shapes) {
      const bb = AABB.fromShape(shape, blockCoords);
      const vertices = bb.expand(-1e-3, -1e-3, -1e-3).toVertices();
      
      for (const vertex of vertices) {
        const dir = vertex.minus(eyePosition).normalize().scale(0.3);
        const hit = this.bot.world.raycast(eyePosition, dir, 256 * 10);
        if (hit?.position?.equals(blockCoords)) return true;
      }
    }
    
    return false;
  }

  private *getAllVisibleBlocksInSurroundings(): Generator<{ block: PBlock; blockCoords: Vec3 }> {
    // Iterate through loaded chunks
    for (const { chunkX, chunkZ, column } of this.bot.world.getColumns()) {
      if (!column) continue;
      
      const minY = (this.bot.game as any).minY;
      const maxY = (this.bot.game as any).height;
      const cursor = new Vec3(0, 0, 0);
      
      // Scan each block in the chunk
      for (cursor.y = maxY; cursor.y >= minY; cursor.y--) {
        for (cursor.x = 0; cursor.x < 16; cursor.x++) {
          for (cursor.z = 0; cursor.z < 16; cursor.z++) {
            const blockCoords = new Vec3(
              (chunkX << 4) + cursor.x,
              cursor.y,
              (chunkZ << 4) + cursor.z
            );
            
            if (!this.areCoordsWithinSurroundings(blockCoords)) continue;
            
            const block = column.getBlock(cursor);
            if (BLOCKS_TO_IGNORE.includes(block.name)) continue;
            if (!this.isBlockVisible(block, blockCoords)) continue;
            
            yield { block, blockCoords };
          }
        }
      }
    }
  }

  private *getAllItemEntitiesInSurroundings(): Generator<{ itemEntity: Entity; itemCoords: Vec3 }> {
    for (const entity of Object.values(this.bot.entities)) {
      if (entity.name != null && !['item', 'Item', 'item_stack'].includes(entity.name)) continue;
      
      const itemCoords = entity.position.clone();
      if (!this.areCoordsWithinSurroundings(itemCoords)) continue;
      
      yield { itemEntity: entity, itemCoords };
    }
  }

  public getHydration(): _Surroundings {
    const surroundings = new _Surroundings(this.bot, this.radii);
    
    // Initialize tracking maps
    const trackers = {
      biomes: new Map<Direction, Map<number, number>>(),
      blocks: new Map<Direction, Map<string, number>>(),
      items: new Map<Direction, Map<string, number>>()
    };
    
    Object.values(Direction).forEach(dir => {
      trackers.biomes.set(dir as Direction, new Map());
      trackers.blocks.set(dir as Direction, new Map());
      trackers.items.set(dir as Direction, new Map());
    });

    // Process blocks
    for (const { block, blockCoords } of this.getAllVisibleBlocksInSurroundings()) {
      const [vicinity, distance] = this.getVicinityAndDistanceOfCoords(blockCoords);
      const biome = block.biome.id;
      
      if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
        // Add to immediate surroundings
        if (!surroundings.immediate.blocksToAllCoords.has(block.name)) {
          surroundings.immediate.blocksToAllCoords.set(block.name, []);
        }
        surroundings.immediate.blocksToAllCoords.get(block.name)!.push(blockCoords);
        
        if (biome !== -1) surroundings.immediate.biomes.add(biome as number);
      } else if (vicinity) {
        // Add to distant surroundings
        const direction = vicinity as unknown as Direction;
        const distant = surroundings.distant.get(direction)!;
        
        // Update block count
        distant.blocksToCounts.set(
          block.name, 
          (distant.blocksToCounts.get(block.name) || 0) + 1
        );
        
        // Track closest block
        const currentDistance = trackers.blocks.get(direction)!.get(block.name) || Infinity;
        if (distance < currentDistance) {
          trackers.blocks.get(direction)!.set(block.name, distance);
          distant.blocksToClosestCoords.set(block.name, blockCoords);
        }
        
        // Track closest biome
        if (biome !== -1) {
          const currentBiomeDistance = trackers.biomes.get(direction)!.get(biome) || Infinity;
          if (distance < currentBiomeDistance) {
            trackers.biomes.get(direction)!.set(biome, distance);
            distant.biomesToClosestCoords.set(biome, blockCoords);
          }
        }
      }
    }

    // Process item entities
    for (const { itemEntity, itemCoords } of this.getAllItemEntitiesInSurroundings()) {
      const itemName = itemEntity.getDroppedItem()?.name;
      if (itemName == null) continue;
      const [vicinity, distance] = this.getVicinityAndDistanceOfCoords(itemCoords);
      
      if (vicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
        // Add to immediate surroundings
        if (!surroundings.immediate.itemEntitiesToAllCoords.has(itemName)) {
          surroundings.immediate.itemEntitiesToAllCoords.set(itemName, []);
        }
        surroundings.immediate.itemEntitiesToAllCoords.get(itemName)!.push(itemCoords);
      } else if (vicinity) {
        // Add to distant surroundings
        const direction = vicinity as unknown as Direction;
        const distant = surroundings.distant.get(direction)!;
        
        // Update item count
        distant.itemEntitiesToCounts.set(
          itemName, 
          (distant.itemEntitiesToCounts.get(itemName) || 0) + 1
        );
        
        // Track closest item
        const currentDistance = trackers.items.get(direction)!.get(itemName) || Infinity;
        if (distance < currentDistance) {
          trackers.items.get(direction)!.set(itemName, distance);
          distant.itemEntitiesToClosestCoords.set(itemName, itemCoords);
        }
      }
    }

    return surroundings;
  }
}

// export class SurroundingsHydrater {
//   private bot: Bot;
//   private radii: SurroundingsRadii;

//   constructor(bot: Bot, radii: SurroundingsRadii) {
//     this.bot = bot;
//     this.radii = radii;
//   }

//   private areCoordsWithinSurroundings(coords: Vec3): boolean {
//     const botCoords = this.bot.entity.position;
//     const distanceToCoords = botCoords.distanceTo(coords);
//     return distanceToCoords <= this.radii.distantSurroundingsRadius;
//   }

//   private getVicinityAndDistanceOfCoords(
//     coords: Vec3,
//   ): [Vicinity | undefined, number] {
//     const botCoords = this.bot.entity.position;
//     const distanceToCoords = botCoords.distanceTo(coords);

//     if (distanceToCoords > this.radii.distantSurroundingsRadius) {
//       return [undefined, distanceToCoords];
//     }

//     // Check if it's within immediate surroundings
//     if (distanceToCoords <= this.radii.immediateSurroundingsRadius) {
//       return [Vicinity.IMMEDIATE_SURROUNDINGS, distanceToCoords];
//     }

//     // Check if it's above or below (in a cylindrical column of r=immediateRadius)
//     const dxz = Math.sqrt(
//       (coords.x - botCoords.x) ** 2 + (coords.z - botCoords.z) ** 2,
//     );
//     if (dxz <= this.radii.immediateSurroundingsRadius) {
//       if (coords.y > botCoords.y)
//         return [Vicinity.DISTANT_SURROUNDINGS_UP, distanceToCoords];
//       if (coords.y < botCoords.y)
//         return [Vicinity.DISTANT_SURROUNDINGS_DOWN, distanceToCoords];
//     }

//     // Else, determine horizontal direction
//     const dx = coords.x - botCoords.x;
//     const dz = coords.z - botCoords.z;
//     let angle = Math.atan2(dx, -dz) * (180 / Math.PI);
//     if (angle < 0) angle += 360;

//     if (angle >= 337.5 || angle < 22.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_NORTH, distanceToCoords];
//     if (angle >= 22.5 && angle < 67.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_NORTHEAST, distanceToCoords];
//     if (angle >= 67.5 && angle < 112.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_EAST, distanceToCoords];
//     if (angle >= 112.5 && angle < 157.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_SOUTHEAST, distanceToCoords];
//     if (angle >= 157.5 && angle < 202.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_SOUTH, distanceToCoords];
//     if (angle >= 202.5 && angle < 247.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_SOUTHWEST, distanceToCoords];
//     if (angle >= 247.5 && angle < 292.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_WEST, distanceToCoords];
//     if (angle >= 292.5 && angle < 337.5)
//       return [Vicinity.DISTANT_SURROUNDINGS_NORTHWEST, distanceToCoords];

//     return [Vicinity.DISTANT_SURROUNDINGS_NORTH, distanceToCoords];
//   }

//   private isBlockVisible(block: PBlock, blockCoords: Vec3): boolean {
//     let numExposedSides = 0;
//     for (const offset of [
//       new Vec3(1, 0, 0),
//       new Vec3(-1, 0, 0),
//       new Vec3(0, 1, 0),
//       new Vec3(0, -1, 0),
//       new Vec3(0, 0, 1),
//       new Vec3(0, 0, -1),
//     ]) {
//       const blockAtOffset = this.bot.blockAt(blockCoords.plus(offset));

//       // Increment if block at offset is (fully) exposed
//       if (!blockAtOffset) {
//         numExposedSides++;
//         continue;
//       }

//       // Increment if block at offset is partially exposed
//       let isBlockAtOffsetAFullBlock = false;
//       for (const shape of blockAtOffset.shapes) {
//         const fullX = shape[0] === 0 && shape[3] === 1;
//         const fullY = shape[1] === 0 && shape[4] === 1;
//         const fullZ = shape[2] === 0 && shape[5] === 1;
//         if (fullX && fullY && fullZ) {
//           isBlockAtOffsetAFullBlock = true;
//           break;
//         }
//       }
//       if (!isBlockAtOffsetAFullBlock) {
//         numExposedSides++;
//       }
//     }

//     if (numExposedSides === 0) return false;

//     // Raycast to check if the block is visible
//     const eyePosition = this.bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);
//     const bbs = block.shapes.map((s) => AABB.fromShape(s, blockCoords));
//     for (const bb of bbs) {
//       const vertices = bb.expand(-1e-3, -1e-3, -1e-3).toVertices();
//       for (const vertex of vertices) {
//         // For more precise calcs, you can make the unit vector smaller
//         const dir = vertex.minus(eyePosition).normalize().scale(0.3);
//         const hit = this.bot.world.raycast(eyePosition, dir, 256 * 10);
//         if (hit != null && hit.position) {
//           if (hit.position.equals(blockCoords)) return true;
//         }
//       }
//     }

//     return false;
//   }

//   private *getAllChunksInSurroundings(): Generator<PWorld.ChunkCoordsAndColumn> {
//     // Iterate through loaded chunks
//     for (const chunkCoordsAndColumn of this.bot.world.getColumns()) {
//       if (!chunkCoordsAndColumn.column) continue;

//       // Skip this chunk if none of its corners are within surroundings
//       const chunkMinX = chunkCoordsAndColumn.chunkX << 4;
//       const chunkMinY = (this.bot.game as any).minY; // Bottom-most y-level of world
//       const chunkMinZ = chunkCoordsAndColumn.chunkZ << 4;
//       const chunkMaxX = chunkMinX + 16;
//       const chunkMaxY = (this.bot.game as any).height; // World height
//       const chunkMaxZ = chunkMinZ + 16;
//       const chunkCornerCoords = [
//         new Vec3(chunkMinX, chunkMinY, chunkMinZ),
//         new Vec3(chunkMinX, chunkMinY, chunkMaxZ),
//         new Vec3(chunkMaxX, chunkMinY, chunkMinZ),
//         new Vec3(chunkMaxX, chunkMinY, chunkMaxZ),
//         new Vec3(chunkMinX, chunkMaxY, chunkMinZ),
//         new Vec3(chunkMinX, chunkMaxY, chunkMaxZ),
//         new Vec3(chunkMaxX, chunkMaxY, chunkMinZ),
//         new Vec3(chunkMaxX, chunkMaxY, chunkMaxZ),
//       ];
//       // console.log(chunkCoordsAndColumn.column,  chunkCornerCoords.some((cornerCoords) =>
//       // this.areCoordsWithinSurroundings(cornerCoords)))
//       // if (
//       //   !chunkCornerCoords.some((cornerCoords) =>
//       //     this.areCoordsWithinSurroundings(cornerCoords),
//       //   )
//       // )
//       //   continue;

//       // Yield since chunk is at least partially in surroundings
//       yield chunkCoordsAndColumn;
//     }
//   }

//   private *getAllBlocksFromChunkThatAreInSurroundings(
//     chunkCoordsAndColumn: PWorld.ChunkCoordsAndColumn,
//   ): Generator<{ block: PBlock; blockCoords: Vec3 }> {
//     const cursor = new Vec3(0, 0, 0);
//     for (
//       cursor.y = (this.bot.game as any).height;
//       cursor.y >= (this.bot.game as any).minY;
//       cursor.y--
//     ) {
//       for (cursor.x = 0; cursor.x < 16; cursor.x++) {
//         for (cursor.z = 0; cursor.z < 16; cursor.z++) {
//           const blockCoords = new Vec3(
//             (chunkCoordsAndColumn.chunkX << 4) + cursor.x,
//             cursor.y,
//             (chunkCoordsAndColumn.chunkZ << 4) + cursor.z,
//           );
//           if (!this.areCoordsWithinSurroundings(blockCoords)) {
//             continue;
//           }
//           const block = chunkCoordsAndColumn.column.getBlock(cursor);
//           if (block.name in BLOCKS_TO_IGNORE) continue;
//           yield { block, blockCoords };
//         }
//       }
//     }
//   }

//   private *getAllVisibleBlocksInSurroundings(): Generator<{
//     block: PBlock;
//     blockCoords: Vec3;
//   }> {
//     for (const chunkCoordsAndColumn of this.getAllChunksInSurroundings()) {
//       for (const {
//         block,
//         blockCoords,
//       } of this.getAllBlocksFromChunkThatAreInSurroundings(
//         chunkCoordsAndColumn,
//       )) {
//         if (!this.isBlockVisible(block, blockCoords)) continue;
//         yield { block, blockCoords };
//       }
//     }
//   }

//   private *getAllItemEntitiesInSurroundings(): Generator<{
//     itemEntity: any; // Using 'any' for now, ideally this would be a more specific type
//     itemCoords: Vec3;
//   }> {
//     // Iterate through all entities in the world
//     for (const entity of Object.values(this.bot.entities)) {
//       // Check if entity is an item entity
//       if (entity.name !== 'item' && entity.name !== 'Item' && entity.name !== 'item_stack') continue;

//       const itemCoords = entity.position.clone();
      
//       // Check if item is within surroundings
//       if (!this.areCoordsWithinSurroundings(itemCoords)) continue;

//       yield {
//         itemEntity: entity,
//         itemCoords: itemCoords
//       };
//     }
//   }

//   public getHydration(): _Surroundings {
//     // Initialize empty surroundings
//     const surroundings = new _Surroundings(this.bot, this.radii);

//     const biomesToClosestDistanceByDirection: Map<Direction,
//       Map<number, number>
//     > = new Map();
//     Object.values(Direction).forEach((dir) => {
//       biomesToClosestDistanceByDirection.set(dir as Direction, new Map());
//     });

//     const blocksToClosestDistanceByDirection: Map<
//       Direction,
//       Map<string, number>
//     > = new Map();
//     Object.values(Direction).forEach((dir) => {
//       blocksToClosestDistanceByDirection.set(dir as Direction, new Map());
//     });

//     const itemsToClosestDistanceByDirection: Map<
//       Direction,
//       Map<string, number>
//     > = new Map();
//     Object.values(Direction).forEach((dir) => {
//       itemsToClosestDistanceByDirection.set(dir as Direction, new Map());
//     });

//     // Process blocks in surroundings
//     for (const {
//       block,
//       blockCoords,
//     } of this.getAllVisibleBlocksInSurroundings()) {
//       const [blockVicinity, blockDistance] =
//         this.getVicinityAndDistanceOfCoords(blockCoords);

//       const biome = block.biome.id;
//       if (blockVicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
//         // Add block
//         if (!surroundings.immediate.blocksToAllCoords.has(block.name)) {
//           surroundings.immediate.blocksToAllCoords.set(block.name, []);
//         }
//         surroundings.immediate.blocksToAllCoords
//           .get(block.name)!
//           .push(blockCoords);

//         // Add biome
//         if (biome !== -1) {
//           surroundings.immediate.biomes.add(biome as number);
//         }
//       } else {
//         const direction = blockVicinity as unknown as Direction;
//         const distantSurroundingsInDirection =
//           surroundings.distant.get(direction)!;

//         // Update blocks count
//         const currentCount =
//           distantSurroundingsInDirection.blocksToCounts.get(block.name) || 0;
//         distantSurroundingsInDirection.blocksToCounts.set(
//           block.name,
//           currentCount + 1,
//         );

//         // Update closest block if the block is the new closest of this block for this direction
//         const currentBlockDistance =
//           blocksToClosestDistanceByDirection.get(direction)!.get(block.name) ||
//           Infinity;
//         if (blockDistance < currentBlockDistance) {
//           blocksToClosestDistanceByDirection
//             .get(direction)!
//             .set(block.name, blockDistance);
//           distantSurroundingsInDirection.blocksToClosestCoords.set(
//             block.name,
//             blockCoords,
//           );
//         }

//         // Update closest biome if the block's biome is the new closest of this biome for this direction
//         if (biome !== -1) {
//           const currentBiomeDistance =
//             biomesToClosestDistanceByDirection.get(direction)!.get(biome) ||
//             Infinity;
//           if (blockDistance < currentBiomeDistance) {
//             biomesToClosestDistanceByDirection
//               .get(direction)!
//               .set(biome, blockDistance);
//             distantSurroundingsInDirection.biomesToClosestCoords.set(
//               biome,
//               blockCoords,
//             );
//           }
//         }
//       }
//     }

//     // Process item entities in surroundings
//     for (const {
//       itemEntity,
//       itemCoords,
//     } of this.getAllItemEntitiesInSurroundings()) {
//       const itemName = itemEntity.getDroppedItem().displayName || itemEntity.getDroppedItem().name;
//       const [itemVicinity, itemDistance] =
//         this.getVicinityAndDistanceOfCoords(itemCoords);

//       if (itemVicinity === Vicinity.IMMEDIATE_SURROUNDINGS) {
//         // Add item entity to immediate surroundings
//         if (!surroundings.immediate.itemEntitiesToAllCoords.has(itemName)) {
//           surroundings.immediate.itemEntitiesToAllCoords.set(itemName, []);
//         }
//         surroundings.immediate.itemEntitiesToAllCoords
//           .get(itemName)!
//           .push(itemCoords);
//       } else {
//         const direction = itemVicinity as unknown as Direction;
//         const distantSurroundingsInDirection =
//           surroundings.distant.get(direction)!;

//         // Update item counts
//         const currentCount =
//           distantSurroundingsInDirection.itemEntitiesToCounts.get(itemName) || 0;
//         distantSurroundingsInDirection.itemEntitiesToCounts.set(
//           itemName,
//           currentCount + 1,
//         );

//         // Update closest item if this item is the new closest of this type for this direction
//         const currentItemDistance =
//           itemsToClosestDistanceByDirection.get(direction)!.get(itemName) ||
//           Infinity;
//         if (itemDistance < currentItemDistance) {
//           itemsToClosestDistanceByDirection
//             .get(direction)!
//             .set(itemName, itemDistance);
//           distantSurroundingsInDirection.itemEntitiesToClosestCoords.set(
//             itemName,
//             itemCoords,
//           );
//         }
//       }
//     }

//     return surroundings;
//   }
// }
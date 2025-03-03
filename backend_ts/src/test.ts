import { Bot, createBot } from "mineflayer";
import { Vec3 } from "vec3";
import { Block } from "prismarine-block";
import type {iterators} from 'prismarine-world';
import { AABB } from "@nxg-org/mineflayer-util-plugin";

type RayBlock = iterators.RaycastResult & Block

/**
 * A block that is visible to the bot.
 */
interface VisibleBlock {
  position: Vec3;
  block: Block;
}

/**
 * A class representing an occlusion cone in angular space.
 */
class OcclusionCone {
  minYaw: number;
  maxYaw: number;
  minPitch: number;
  maxPitch: number;
  distance: number; // Minimum distance at which occlusion occurs.

  constructor(minYaw: number, maxYaw: number, minPitch: number, maxPitch: number, distance: number) {
    this.minYaw = this.wrapAngle(minYaw);
    this.maxYaw = this.wrapAngle(maxYaw);
    this.minPitch = minPitch;
    this.maxPitch = maxPitch;
    this.distance = distance;
  }

  /**
   * Ensures the angle is within the range [0, 2π].
   */
  private wrapAngle(angle: number): number {
    return (angle + 2 * Math.PI) % (2 * Math.PI);
  }

  /**
   * Checks if a given yaw and pitch are occluded by this cone.
   */
  isOccluded(yaw: number, pitch: number, distance: number): boolean {
    yaw = this.wrapAngle(yaw);

    // Handle cases where yaw wraps around 0 (i.e., from -π to π)
    const yawInRange = this.minYaw <= this.maxYaw ? yaw >= this.minYaw && yaw <= this.maxYaw : yaw >= this.minYaw || yaw <= this.maxYaw; // Handles wraparound case

    return yawInRange && pitch >= this.minPitch && pitch <= this.maxPitch && distance > this.distance;
  }

  /**
   * Computes an occlusion cone from the bot's eye to a block's bounding box.
   */
  static fromBlock(eyePos: Vec3, blockPos: Vec3, shapes: number[][]): OcclusionCone {
    let minYaw = Infinity,
      maxYaw = -Infinity;
    let minPitch = Infinity,
      maxPitch = -Infinity;
    let minDistance = Infinity;

    for (const [minX, minY, minZ, maxX, maxY, maxZ] of shapes) {
      const corners = [
        new Vec3(minX, minY, minZ),
        new Vec3(minX, minY, maxZ),
        new Vec3(minX, maxY, minZ),
        new Vec3(minX, maxY, maxZ),
        new Vec3(maxX, minY, minZ),
        new Vec3(maxX, minY, maxZ),
        new Vec3(maxX, maxY, minZ),
        new Vec3(maxX, maxY, maxZ),
      ].map((corner) => blockPos.plus(corner));

      for (const corner of corners) {
        const dir = corner.minus(eyePos).normalize();
        const yaw = Math.atan2(-dir.x, dir.z);
        const pitch = Math.asin(-dir.y);
        const distance = corner.distanceTo(eyePos);

        minYaw = Math.min(minYaw, yaw);
        maxYaw = Math.max(maxYaw, yaw);
        minPitch = Math.min(minPitch, pitch);
        maxPitch = Math.max(maxPitch, pitch);
        minDistance = Math.min(minDistance, distance);
      }
    }

    return new OcclusionCone(minYaw, maxYaw, minPitch, maxPitch, minDistance);
  }
}

/**
 * A 3D spiral iterator that expands outward from a center block in cubic shells.
 */
class SpiralIterator3d {
  center: Vec3;
  maxDistance: number;
  currentShellDistance: number;
  currentOffsets: Vec3[];
  index: number;

  constructor(center: Vec3, maxDistance: number) {
    this.center = center;
    this.maxDistance = Math.floor(maxDistance);
    this.currentShellDistance = 0;
    this.currentOffsets = [];
    this.index = 0;
    this.generateShell();
  }

  private generateShell() {
    this.currentOffsets = [];
    if (this.currentShellDistance === 0) {
      this.currentOffsets.push(new Vec3(0, 0, 0));
    } else {
      for (let x = -this.currentShellDistance; x <= this.currentShellDistance; x++) {
        for (let y = -this.currentShellDistance; y <= this.currentShellDistance; y++) {
          for (let z = -this.currentShellDistance; z <= this.currentShellDistance; z++) {
            if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === this.currentShellDistance) {
              this.currentOffsets.push(new Vec3(x, y, z));
            }
          }
        }
      }
    }
    this.index = 0;
  }

  next(): Vec3 | null {
    while (this.currentShellDistance <= this.maxDistance) {
      if (this.index < this.currentOffsets.length) {
        const offset = this.currentOffsets[this.index];
        this.index++;
        return this.center.plus(offset);
      } else {
        this.currentShellDistance++;
        if (this.currentShellDistance > this.maxDistance) {
          return null;
        }
        this.generateShell();
      }
    }
    return null;
  }
}

/**
 * Determines if a block is visible by checking all of its bounding boxes.
 */
function isBlockVisible(bot: Bot, eyePos: Vec3, block: Block, blockPos: Vec3, maxDistance: number): RayBlock | null {
  const shapes = block.shapes;

  for (const shape of shapes) {
    const corners = AABB.fromShape(shape, blockPos).expand(-1e-3, -1e-3, -1e-3).toVertices();

    for (const corner of corners) {
      const direction = corner.minus(eyePos).normalize().scale(0.1);
      const hit = bot.world.raycast(eyePos, direction, maxDistance * 15);
      // console.log(hit?.position, blockPos, corner)

      if (hit && hit.position.equals(blockPos)) {
        return hit;
      }
    }
  }
  return null;
}

/**
 * Returns an array of blocks visible to the bot’s eyes.
 *
 * The function iterates over candidate blocks in 3D spiral order starting from
 * the bot's position. For each candidate, it checks if the block center is within
 * the field of view and not occluded by a previously hit block (using an occlusion cone).
 * Then it uses prismarine-world’s built-in raycast (bot.world.raycast) to verify that
 * the candidate is the first block hit along that ray.
 *
 * @param bot         The mineflayer Bot instance.
 * @param maxDistance Maximum distance (in blocks) to consider.
 * @returns           Array of visible blocks.
 */
export function getVisibleBlocks(bot: Bot, maxDistance: number = 256): RayBlock[] {
  const visibleBlocks: RayBlock[] = [];
  const occlusionCones: OcclusionCone[] = [];

  // Compute the eye position (assumed offset of 1.62 from the bot's position).
  const eyePos = bot.entity.position.offset(0, 1.62, 0);
  // Define the field of view (in radians).
  const horizontalFov = Math.PI / 0.5; // ~60°
  const verticalFov = Math.PI / 0.5; // ~60°

  // Start from the block containing the eye position.
  const startBlock = new Vec3(Math.floor(eyePos.x), Math.floor(eyePos.y), Math.floor(eyePos.z));
  const spiral = new SpiralIterator3d(startBlock, maxDistance);
  //   console.log(startBlock, bot.entity.position)

  let iters = 0;
  let rays = 0;
  let hits = 0;
  let candidate: Vec3 | null;
  while ((candidate = spiral.next()) !== null) {
    const block = bot.world.getBlock(candidate);
    if (block === null) continue;
    // if (block.name !== "bedrock") continue;

    if (block.boundingBox === "empty") continue;
    if (block.shapes.length === 0) continue;
    iters++;

    // check if bedrock

    let passOcclusion = false;
    // Compute the center of the candidate block.
    for (const shape of block.shapes) {
      const bb = AABB.fromShape(shape, candidate).expand(-1e-3, -1e-3, -1e-3);
      occlusionTest: for (const corner of bb.toVertices()) {
        const direction = corner.minus(eyePos).normalize();
        const candidateYaw = Math.atan2(-direction.x, direction.z);
        const candidatePitch = Math.asin(-direction.y);

        // Math.PI - bot.entity.yaw converts it to "actual" yaw and pitch
        const deltaYaw = Math.abs(candidateYaw - (Math.PI - bot.entity.yaw));
        // let deltaYaw = candidateYaw - bot.entity.yaw;

        const deltaPitch = candidatePitch - bot.entity.pitch;

        // console.log(deltaYaw)

        // only allow in
        if (Math.abs(deltaYaw) < horizontalFov / 2 && Math.abs(deltaPitch) < verticalFov / 2) {
          const candidateDistance = corner.distanceTo(eyePos);
          for (const cone of occlusionCones) {
            if (cone.isOccluded(candidateYaw, candidatePitch, candidateDistance)) {
              continue occlusionTest;
            }
          }
          passOcclusion = true;
        }
      }
    }

    // console.log(success);
    if (!passOcclusion) continue;

    rays++;
    const hit = isBlockVisible(bot, eyePos, block, candidate, maxDistance)
    // Use prismarine-world’s built-in raycast.
    if (hit != null) {
      visibleBlocks.push(hit);
      const cone = OcclusionCone.fromBlock(eyePos, block.position, block.shapes);
      occlusionCones.push(cone);
    }
  }
  console.log(`Iterations: ${iters}, Rays: ${rays}, ratio: ${rays / iters}`);
  console.log(`Hits: ${hits}, Visible: ${visibleBlocks.length}, ratio: ${visibleBlocks.length / hits}`);
  console.log(occlusionCones.length);
  return visibleBlocks;
}

function getBlockCount(bot: Bot, maxDistance: number) {
  const eyePos = bot.entity.position.offset(0, 1.62, 0);
  const startBlock = new Vec3(Math.floor(eyePos.x), Math.floor(eyePos.y), Math.floor(eyePos.z));
  const spiral = new SpiralIterator3d(startBlock, maxDistance);

  const visibleBlocks: RayBlock[] = [];
  let iters = 0;
  let candidate: Vec3 | null;
  let count = 0;
  while ((candidate = spiral.next()) !== null) {
    const block = bot.world.getBlock(candidate);
    if (block === null) continue;
    if (block.name !== "bedrock") continue;
    iters++;
    count++;
    visibleBlocks.push(block as any);
  }
  return visibleBlocks;
}

// Example usage:
const bot = createBot({
  username: "SemanticSteve",
  viewDistance: "far",
});

async function debugBlocks(visibleBlocks: RayBlock[], amt=10, time=1000) {
  // repeat for a few seconds
  return await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (amt-- <= 0) {
        clearInterval(interval);
        resolve();
      }
      for (const block of visibleBlocks) {
        // chat a fire particle
        bot.chat(`/particle minecraft:flame ${block.intersect.x} ${block.intersect.y} ${block.intersect.z} 0 0 0 0 1`);
      }
    }, time);
  } );


}

async function test() {
  await bot.waitForChunksToLoad();
  console.log("Bot spawned and ready!");
  const start = Date.now();
  const dist = 50;
  const visibleBlocks = getVisibleBlocks(bot, dist);
  const end = Date.now();
  const actual = getBlockCount(bot, dist);

  // identify if duplicate blocks
  const blockMap = new Map();
  for (const block of visibleBlocks) {
    const key = block.position.toString();
    if (blockMap.has(key)) {
      blockMap.set(key, blockMap.get(key) + 1);
    } else {
      blockMap.set(key, 1);
    }
  }

  // console.log(visibleBlocks.map((b) => [b.position, b.position.distanceTo(bot.entity.position.offset(0, 1.62, 0))]));
  // console.log(actual.map((b) => [b.position, b.position.distanceTo(bot.entity.position.offset(0, 1.62, 0))]));
  console.log(`Visible blocks: ${visibleBlocks.length}`);
  console.log(`Actual blocks: ${actual.length}`);
  console.log(blockMap.size === visibleBlocks.length);


  // repeat for a few seconds
  console.log(`Time taken: ${end - start} ms`);
  await debugBlocks(visibleBlocks, 10, 1000);

}

bot.once("spawn", async () => {
  await test()

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message === 'test') {
      test();
    }
  });
});


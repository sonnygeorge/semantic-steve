import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import * as THREE from "three";
import { Worker } from "worker_threads";
const { createCanvas } = require("node-canvas-webgl/lib");
import fs from "fs/promises";
import path from "path";
import { Vec3 } from "vec3";
const {
  Viewer,
  WorldView,
  getBufferFromStream,
} = require("prismarine-viewer/viewer");
import { SUPPORTED_THING_TYPES, Thing, InvalidThingError } from "../../thing";
import { TakeScreenshotOfResults } from "./results";

export class TakeScreenshotOf extends Skill {
  public static readonly TIMEOUT_MS: number = 18000; // 18 seconds
  public static readonly METADATA: SkillMetadata = {
    name: "takeScreenshotOf",
    signature:
      "takeScreenshotOf(thing: string, atCoordinates?: [number, number, number])",
    docstring: `
      /**
       * Attempts to take a screenshot of the specified thing, assuming it is in the
       * immediate surroundings.
       * @param thing - The thing to take a screenshot of.
       * @param atCoordinates - Optional coordinates to disamiguate where the
       * thing is located.
       */
    `,
  };

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);

    // global.THREE = require('three')
    // global.Worker = require('worker_threads').Worker
  }

  public async invoke(
    thing: string,
    atCoordinates?: [number, number, number],
  ): Promise<void> {
    try {
      // Find the Thing object using the bot's thing factory
      let targetThing: Thing;
      try {
        targetThing = this.bot.thingFactory.createThing(thing);
      } catch (error) {
        console.log(error);
        if (error instanceof InvalidThingError) {
          // Invalid thing name
          this.onResolution(
            new TakeScreenshotOfResults.InvalidThing(
              thing,
              SUPPORTED_THING_TYPES,
            ),
          );
          return;
        }
        // Other errors
        throw error;
      }

      // Check if the Thing is visible in immediate surroundings
      if (!targetThing.isVisibleInImmediateSurroundings()) {
        // The thing exists but isn't visible in immediate surroundings
        this.onResolution(
          new TakeScreenshotOfResults.InvalidThing(
            thing,
            `${SUPPORTED_THING_TYPES} that are visible in immediate surroundings`,
          ),
        );
        return;
      }

      // Take the screenshot
      const screenshotBuffer = await this.captureScreenshot(targetThing);

      if (!screenshotBuffer) {
        // Screenshot capture failed
        this.onResolution(
          new TakeScreenshotOfResults.InvalidThing(
            thing,
            SUPPORTED_THING_TYPES,
          ),
        );
        return;
      }

      // Save the screenshot
      const screenshotPath = await this.saveScreenshot(screenshotBuffer, thing);

      // Return success with the appropriate result type
      this.onResolution(
        new TakeScreenshotOfResults.Success(thing, screenshotPath),
      );
    } catch (error) {
      console.log("error", error);
      // Use InvalidThing result for any errors
      this.onResolution(
        new TakeScreenshotOfResults.InvalidThing(thing, SUPPORTED_THING_TYPES),
      );
    }
  }

  private viewDistanceToNumber(): number {
    switch (this.bot.settings.viewDistance) {
      case "tiny":
        return 4;
      case "short":
        return 8;
      case "normal":
        return 12;
      case "far":
        return 16;
      default:
        return 12; // Default to normal if not recognized
    }
  }

  private async captureScreenshot(thing: Thing): Promise<Buffer | null> {
    try {
      const viewDistance = this.viewDistanceToNumber();
      const width = 1920;
      const height = 1080;
      const version = this.bot.version;

      // Get the world from bot
      const world = this.bot.world;

      // Create canvas and renderer
      const canvas = createCanvas(width, height);
      const renderer = new THREE.WebGLRenderer({ canvas });
      const viewer = new Viewer(renderer);

      if (!viewer.setVersion(version)) {
        throw new Error(`Unsupported version: ${version}`);
      }

      // Get the thing's position
      const position = await thing.locateNearest();
      if (!position) {
        console.error(`Could not find ${thing.name}`);
        return null;
      }

      //   const thingDetails = await this.getThingDetails(thing);
      //   if (!thingDetails) return null;

      //   const { position } = thingDetails!;

      // Use bot's head position and viewing angle for the camera
      // This is a simplified approach - we'll just position the camera where the bot is
      const cameraPosition = this.bot.entity.position.clone();
      cameraPosition.y += this.bot.entity.height; // Position at head level

      // Create world view
      const worldView = new WorldView(world, viewDistance, cameraPosition);
      viewer.listen(worldView);

      // Position the camera at the bot's position
      viewer.camera.position.set(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z,
      );

      // calculate the yaw and pitch of the bot's current position to the target
      const targetPosition = position;
      const dx = targetPosition.x - cameraPosition.x;
      const dy = targetPosition.y - cameraPosition.y;
      const dz = targetPosition.z - cameraPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Calculate pitch (vertical angle) - in Minecraft/Mineflayer coordinate system
      const pitch = Math.asin(dy / distance); // Negative because looking up is negative in Minecraft

      // Calculate yaw (horizontal angle) - in Minecraft/Mineflayer coordinate system
      const yaw = Math.atan2(-dx, -dz); // Adjust for Minecraft's coordinate system

      // Set the camera rotation
      viewer.camera.rotation.set(pitch, yaw, 0, "ZYX");
      // TODO: In the future, implement smart camera positioning logic to frame the target
      // This would involve calculating an offset based on the thing's type and size
      // For now, we're just using the bot's viewpoint

      // Initialize the world view
      await worldView.init(cameraPosition);

      // Synchronize with bot's entities if available
      if (this.bot.entities) {
        for (const entityId in this.bot.entities) {
          const e = this.bot.entities[entityId];
          if (e !== this.bot.entity) {
            // Add other entities to the world view
            viewer.updateEntity({
              id: e.id,
              pos: e.position,
              pitch: e.pitch,
              yaw: e.yaw,
            });
          }
        }
      }

      // Wait for chunks to render
      await viewer.world.waitForChunksToRender();

      // Render the scene
      renderer.render(viewer.scene, viewer.camera);

      // Create image stream
      const imageStream = canvas.createJPEGStream({
        // bufsize: 4096,
        quality: 100,
        progressive: false,
      });

      // Get buffer from stream
      const buffer = await getBufferFromStream(imageStream);

      // Clean up resources
      //   viewer.dispose();
      //   renderer.dispose();

      return buffer;
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      return null;
    }
  }

  /**
   * Gets the position details for a Thing.
   * Necessary for positioning the camera to take a screenshot.
   */
  private async getThingDetails(
    thing: Thing,
  ): Promise<{ position: Vec3; type: string; object: any } | null> {
    // First, check if it's an entity
    const entities = this.bot.entities;
    for (const entityId in entities) {
      const entity = entities[entityId];

      // Check if this entity matches the thing's name
      if (
        (entity.name &&
          entity.name.toLowerCase() === thing.name.toLowerCase()) ||
        (entity.displayName &&
          entity.displayName.toLowerCase().includes(thing.name.toLowerCase()))
      ) {
        return {
          position: entity.position,
          type: "entity",
          object: entity,
        };
      }
    }

    // Then check if it's a block
    const blocks = this.bot.findBlocks({
      matching: (block) => {
        const blockName =
          this.bot.registry.blocksByStateId[block.stateId]?.name;
        return blockName?.toLowerCase().includes(thing.name.toLowerCase());
      },
      maxDistance: 32,
      count: 1,
    });

    if (blocks.length > 0) {
      const blockPos = blocks[0];
      const block = this.bot.blockAt(blockPos);

      if (block) {
        return {
          position: block.position,
          type: "block",
          object: block,
        };
      }
    }

    return null;
  }

  private async saveScreenshot(buffer: Buffer, thing: string): Promise<string> {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), "screenshots");
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Create filename based on thing and timestamp
    const fileName = `${thing
      .toLowerCase()
      .replace(/\s+/g, "_")}_${Date.now()}.jpg`;
    const filePath = path.join(screenshotsDir, fileName);

    // Write the file
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  public async pause(): Promise<void> {
    console.log(`Pausing '${TakeScreenshotOf.METADATA.name}'`);
  }

  public async resume(): Promise<void> {
    console.log(`Resuming '${TakeScreenshotOf.METADATA.name}'`);
  }
}

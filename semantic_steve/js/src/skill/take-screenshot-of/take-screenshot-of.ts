import assert from "assert";
import { Bot } from "mineflayer";
import { Skill, SkillMetadata, SkillResolutionHandler } from "../skill";
import * as THREE from "three";
const { createCanvas } = require("node-canvas-webgl/lib");
import * as path from "path";
import * as fs from "fs";
import { Vec3 } from "vec3";
import { keyboard, Key } from "@nut-tree-fork/nut-js";
import { execSync } from "child_process";
const {
  Viewer,
  WorldView,
  getBufferFromStream,
} = require("prismarine-viewer/viewer");
import { SUPPORTED_THING_TYPES, ThingType } from "../../thing-type";
import { InvalidThingError } from "../../types";
import { TakeScreenshotOfResults } from "./results";
import { asyncSleep } from "../../utils/generic";
import { BOT_EYE_HEIGHT } from "../../constants";
import { MC_COMMAND_WAIT_MS, SCREENSHOT_WAIT_MS } from "../../constants";

// TODO: Currently this skill isn't pausable/resumable like it should be.

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

// NOTE: If this is slower, commands in the chat are prone to returning:
// "Chat disabled due to expired profile public key. Please try reconnecting."
keyboard.config.autoDelayMs = 130;

// NOTE: This is a macOS-specific implementation.
const MC_SCREENSHOT_DIR_PATH = path.join(
  process.env.HOME || "",
  "Library",
  "Application Support",
  "minecraft",
  "screenshots",
);

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
       * 
       * @param thing - The thing to take a screenshot of.
       * @param atCoordinates - Optional coordinates to disambiguate where the
       * thing is located.
       */
    `,
  };

  public screenshotDir: string;
  private thing?: ThingType;
  private atCoords?: Vec3;

  constructor(bot: Bot, onResolution: SkillResolutionHandler) {
    super(bot, onResolution);
    this.screenshotDir = process.env.SEMANTIC_STEVE_SCREENSHOT_DIR as string;
    // Ensure screenshot directory exists
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
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

  private async takePOVScreenshotWithViewer(
    destinationPath: string,
  ): Promise<boolean> {
    assert(this.atCoords);
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const renderer = new THREE.WebGLRenderer({ canvas });
    const viewer = new Viewer(renderer);
    if (!viewer.setVersion(this.bot.version)) {
      throw new Error(
        `prismarine-viewer does not support version: ${this.bot.version}`,
      );
    }

    const eyePosition = this.bot.entity.position.offset(0, BOT_EYE_HEIGHT, 0);

    // Create world view
    const worldView = new WorldView(
      this.bot.world,
      this.viewDistanceToNumber(),
      eyePosition,
    );
    viewer.listen(worldView);

    // Set up the viewer
    viewer.camera.position.set(eyePosition.x, eyePosition.y, eyePosition.z);
    viewer.camera.lookAt(this.atCoords.x, this.atCoords.y, this.atCoords.z);

    // Initialize the world view
    await worldView.init(eyePosition);

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
    fs.writeFileSync(destinationPath, buffer); // Save the screenshot to the destination path

    // Clean up resources
    // viewer.dispose();
    // renderer.dispose();

    return true;
  }

  // NOTE: This is a macOS-specific implementation.
  private async takePOVScreenshotWithComputerControlAndSpectatorMode(
    destinationPath: string,
  ): Promise<boolean> {
    const typeMinecraftChat = async (command: string): Promise<void> => {
      await keyboard.type(Key.Enter); // Make sure chat is closed
      await keyboard.type(Key.T); // Open chat
      await keyboard.type(command);
      await keyboard.type(Key.Enter);
      await asyncSleep(MC_COMMAND_WAIT_MS); // Wait for command to process
    };

    // Get the currently focused application
    let previousApp: string | null = null;
    try {
      previousApp = execSync(
        `osascript -e 'tell application "System Events" to get bundle identifier of (first process whose frontmost is true)'`,
      )
        .toString()
        .trim();
    } catch (error) {
      console.error("Failed to get current frontmost application:", error);
    }

    // Focus the Minecraft window
    console.log("Attempting to focus Minecraft window...");
    try {
      execSync(
        `osascript -e 'tell application "System Events" to tell (first process whose name contains "java" or name contains "Minecraft") to set frontmost to true'`,
      );
    } catch (error) {
      console.error("Failed to focus Minecraft window:", error);
      return false;
    }

    // Spectate player
    await typeMinecraftChat("/gamemode spectator");
    await typeMinecraftChat(`/spectate ${this.bot.username}`);

    // Take screenshot
    const beforeFiles = fs.readdirSync(MC_SCREENSHOT_DIR_PATH);
    await keyboard.type(Key.F2); // Take screenshot
    await asyncSleep(SCREENSHOT_WAIT_MS); // Wait for screenshot to be taken
    const afterFiles = fs.readdirSync(MC_SCREENSHOT_DIR_PATH);
    const newFiles = afterFiles.filter((file) => !beforeFiles.includes(file));
    if (newFiles.length === 0) {
      console.error("No new screenshot file detected");
      return false;
    }
    const screenshotPath = path.join(MC_SCREENSHOT_DIR_PATH, newFiles[0]);
    fs.copyFileSync(screenshotPath, destinationPath); // Copy over to destination path

    // Open the chat again (allowing us to restore the previous app)
    await keyboard.type(Key.T); // Open chat
    await asyncSleep(MC_COMMAND_WAIT_MS); // Wait for chat to open

    // Restore the previously focused application
    console.log("Restoring focus of previous application:", previousApp);
    if (previousApp) {
      try {
        execSync(
          `osascript -e 'tell application id "${previousApp}" to activate'`,
        );
      } catch (error) {
        console.error("Failed to restore previous application:", error);
      }
    }

    return true;
  }

  private async startOrResumeScreenshotting(): Promise<void> {
    assert(this.atCoords);
    assert(this.thing);

    // Look at the target thing
    await this.bot.lookAt(this.atCoords);

    // Take screenshot of bot's POV
    const destinationPath = path.join(
      this.screenshotDir,
      `${new Date().toISOString()}_${this.thing.name}.png`,
    );
    let wasSuccess = false;
    if (
      process.env.USE_COMPUTER_CONTROL_FOR_SCREENSHOT &&
      process.env.USE_COMPUTER_CONTROL_FOR_SCREENSHOT === "true"
    ) {
      wasSuccess =
        await this.takePOVScreenshotWithComputerControlAndSpectatorMode(
          destinationPath,
        );
    } else {
      wasSuccess = await this.takePOVScreenshotWithViewer(destinationPath);
    }
    if (wasSuccess) {
      const result = new TakeScreenshotOfResults.Success(
        this.thing.name,
        destinationPath,
      );
      this.resolve(result);
    } else {
      const result = new TakeScreenshotOfResults.Failed(this.thing.name);
      this.resolve(result);
    }
  }

  // ============================
  // Implementation of Skill API
  // ============================

  public async doInvoke(
    thing: string,
    atCoordinates?: [number, number, number],
  ): Promise<void> {
    // Validate thing
    try {
      this.thing = this.bot.thingTypeFactory.createThingType(thing);
    } catch (err) {
      if (err instanceof InvalidThingError) {
        const result = new TakeScreenshotOfResults.InvalidThing(
          thing,
          SUPPORTED_THING_TYPES.toString(),
        );
        this.resolve(result);
        return;
      }
    }
    assert(typeof this.thing === "object"); // Obviously true (above), but TS compiler doesn't know this

    // Validate/ascertain atCoords
    if (atCoordinates) {
      this.atCoords = new Vec3(
        atCoordinates[0],
        atCoordinates[1],
        atCoordinates[2],
      );
      if (!this.thing.isVisibleInImmediateSurroundingsAt(this.atCoords)) {
        const result = new TakeScreenshotOfResults.InvalidCoords(thing);
        this.resolve(result);
        return;
      }
    } else {
      this.atCoords = await this.thing.locateNearestInImmediateSurroundings();
      if (!this.atCoords) {
        const result =
          new TakeScreenshotOfResults.ThingNotInImmediateSurroundings(thing);
        this.resolve(result);
        return;
      }
    }

    // Enter screenshot taking
    await this.startOrResumeScreenshotting();
  }

  // TODO:

  public async doPause(): Promise<void> {}

  public async doResume(): Promise<void> {}

  public async doStop(): Promise<void> {}
}

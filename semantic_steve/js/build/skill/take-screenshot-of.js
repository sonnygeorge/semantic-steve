"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakeScreenshotOf = void 0;
const skill_1 = require("./skill");
const THREE = __importStar(require("three"));
const { createCanvas } = require("node-canvas-webgl/lib");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const { Viewer, WorldView, getBufferFromStream, } = require("prismarine-viewer/viewer");
const thing_1 = require("../thing");
const skill_results_1 = require("../skill-results");
class TakeScreenshotOf extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        // global.THREE = require('three')
        // global.Worker = require('worker_threads').Worker
    }
    invoke(thing, atCoordinates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Find the Thing object using the bot's thing factory
                let targetThing;
                try {
                    targetThing = this.bot.thingFactory.createThing(thing);
                }
                catch (error) {
                    console.log(error);
                    if (error instanceof thing_1.InvalidThingError) {
                        // Invalid thing name
                        this.onResolution(new skill_results_1.TakeScreenshotOfResults.InvalidThing(thing, thing_1.SUPPORTED_THING_TYPES));
                        return;
                    }
                    // Other errors
                    throw error;
                }
                // Check if the Thing is visible in immediate surroundings
                if (!targetThing.isVisibleInImmediateSurroundings()) {
                    // The thing exists but isn't visible in immediate surroundings
                    this.onResolution(new skill_results_1.TakeScreenshotOfResults.InvalidThing(thing, `${thing_1.SUPPORTED_THING_TYPES} that are visible in immediate surroundings`));
                    return;
                }
                // Take the screenshot
                const screenshotBuffer = yield this.captureScreenshot(targetThing);
                if (!screenshotBuffer) {
                    // Screenshot capture failed
                    this.onResolution(new skill_results_1.TakeScreenshotOfResults.InvalidThing(thing, thing_1.SUPPORTED_THING_TYPES));
                    return;
                }
                // Save the screenshot
                const screenshotPath = yield this.saveScreenshot(screenshotBuffer, thing);
                // Return success with the appropriate result type
                this.onResolution(new skill_results_1.TakeScreenshotOfResults.Success(thing, screenshotPath));
            }
            catch (error) {
                console.log("error", error);
                // Use InvalidThing result for any errors
                this.onResolution(new skill_results_1.TakeScreenshotOfResults.InvalidThing(thing, thing_1.SUPPORTED_THING_TYPES));
            }
        });
    }
    viewDistanceToNumber() {
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
    captureScreenshot(thing) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const position = yield thing.locateNearest();
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
                viewer.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
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
                viewer.camera.rotation.set(pitch, yaw, 0, 'ZYX');
                // TODO: In the future, implement smart camera positioning logic to frame the target
                // This would involve calculating an offset based on the thing's type and size
                // For now, we're just using the bot's viewpoint
                // Initialize the world view
                yield worldView.init(cameraPosition);
                // Synchronize with bot's entities if available
                if (this.bot.entities) {
                    for (const entityId in this.bot.entities) {
                        const e = this.bot.entities[entityId];
                        if (e !== this.bot.entity) {
                            // Add other entities to the world view
                            viewer.updateEntity({ id: e.id, pos: e.position, pitch: e.pitch, yaw: e.yaw });
                        }
                    }
                }
                // Wait for chunks to render
                yield viewer.world.waitForChunksToRender();
                // Render the scene
                renderer.render(viewer.scene, viewer.camera);
                // Create image stream
                const imageStream = canvas.createJPEGStream({
                    // bufsize: 4096,
                    quality: 100,
                    progressive: false,
                });
                // Get buffer from stream
                const buffer = yield getBufferFromStream(imageStream);
                // Clean up resources
                //   viewer.dispose();
                //   renderer.dispose();
                return buffer;
            }
            catch (error) {
                console.error("Error capturing screenshot:", error);
                return null;
            }
        });
    }
    /**
     * Gets the position details for a Thing.
     * Necessary for positioning the camera to take a screenshot.
     */
    getThingDetails(thing) {
        return __awaiter(this, void 0, void 0, function* () {
            // First, check if it's an entity
            const entities = this.bot.entities;
            for (const entityId in entities) {
                const entity = entities[entityId];
                // Check if this entity matches the thing's name
                if ((entity.name &&
                    entity.name.toLowerCase() === thing.name.toLowerCase()) ||
                    (entity.displayName &&
                        entity.displayName.toLowerCase().includes(thing.name.toLowerCase()))) {
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
                    var _a;
                    const blockName = (_a = this.bot.registry.blocksByStateId[block.stateId]) === null || _a === void 0 ? void 0 : _a.name;
                    return blockName === null || blockName === void 0 ? void 0 : blockName.toLowerCase().includes(thing.name.toLowerCase());
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
        });
    }
    saveScreenshot(buffer, thing) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create screenshots directory if it doesn't exist
            const screenshotsDir = path_1.default.join(process.cwd(), "screenshots");
            yield promises_1.default.mkdir(screenshotsDir, { recursive: true });
            // Create filename based on thing and timestamp
            const fileName = `${thing
                .toLowerCase()
                .replace(/\s+/g, "_")}_${Date.now()}.jpg`;
            const filePath = path_1.default.join(screenshotsDir, fileName);
            // Write the file
            yield promises_1.default.writeFile(filePath, buffer);
            return filePath;
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Pausing '${TakeScreenshotOf.metadata.name}'`);
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Resuming '${TakeScreenshotOf.metadata.name}'`);
        });
    }
}
exports.TakeScreenshotOf = TakeScreenshotOf;
TakeScreenshotOf.metadata = {
    name: "takeScreenshotOf",
    signature: "takeScreenshotOf(thing: string, atCoordinates?: [number, number, number])",
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

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
const assert_1 = __importDefault(require("assert"));
const skill_1 = require("../skill");
const THREE = __importStar(require("three"));
const { createCanvas } = require("node-canvas-webgl/lib");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const vec3_1 = require("vec3");
const nut_js_1 = require("@nut-tree-fork/nut-js");
const child_process_1 = require("child_process");
const { Viewer, WorldView, getBufferFromStream, } = require("prismarine-viewer/viewer");
const thing_type_1 = require("../../thing-type");
const types_1 = require("../../types");
const results_1 = require("./results");
const generic_1 = require("../../utils/generic");
const constants_1 = require("../../constants");
const constants_2 = require("../../constants");
// TODO: Currently this skill isn't pausable/resumable like it should be.
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;
// NOTE: If this is slower, commands in the chat are prone to returning:
// "Chat disabled due to expired profile public key. Please try reconnecting."
nut_js_1.keyboard.config.autoDelayMs = 130;
// NOTE: This is a macOS-specific implementation.
const MC_SCREENSHOT_DIR_PATH = path.join(process.env.HOME || "", "Library", "Application Support", "minecraft", "screenshots");
class TakeScreenshotOf extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.screenshotDir = process.env.SEMANTIC_STEVE_SCREENSHOT_DIR;
        // Ensure screenshot directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
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
    takePOVScreenshotWithViewer(destinationPath) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.atCoords);
            const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            const renderer = new THREE.WebGLRenderer({ canvas });
            const viewer = new Viewer(renderer);
            if (!viewer.setVersion(this.bot.version)) {
                throw new Error(`prismarine-viewer does not support version: ${this.bot.version}`);
            }
            const eyePosition = this.bot.entity.position.offset(0, constants_1.BOT_EYE_HEIGHT, 0);
            // Create world view
            const worldView = new WorldView(this.bot.world, this.viewDistanceToNumber(), eyePosition);
            viewer.listen(worldView);
            // Set up the viewer
            viewer.camera.position.set(eyePosition.x, eyePosition.y, eyePosition.z);
            viewer.camera.lookAt(this.atCoords.x, this.atCoords.y, this.atCoords.z);
            // Initialize the world view
            yield worldView.init(eyePosition);
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
            fs.writeFileSync(destinationPath, buffer); // Save the screenshot to the destination path
            // Clean up resources
            // viewer.dispose();
            // renderer.dispose();
            return true;
        });
    }
    // NOTE: This is a macOS-specific implementation.
    takePOVScreenshotWithComputerControlAndSpectatorMode(destinationPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const typeMinecraftChat = (command) => __awaiter(this, void 0, void 0, function* () {
                yield nut_js_1.keyboard.type(nut_js_1.Key.Enter); // Make sure chat is closed
                yield nut_js_1.keyboard.type(nut_js_1.Key.T); // Open chat
                yield nut_js_1.keyboard.type(command);
                yield nut_js_1.keyboard.type(nut_js_1.Key.Enter);
                yield (0, generic_1.asyncSleep)(constants_2.MC_COMMAND_WAIT_MS); // Wait for command to process
            });
            // Get the currently focused application
            let previousApp = null;
            try {
                previousApp = (0, child_process_1.execSync)(`osascript -e 'tell application "System Events" to get bundle identifier of (first process whose frontmost is true)'`)
                    .toString()
                    .trim();
            }
            catch (error) {
                console.error("Failed to get current frontmost application:", error);
            }
            // Focus the Minecraft window
            console.log("Attempting to focus Minecraft window...");
            try {
                (0, child_process_1.execSync)(`osascript -e 'tell application "System Events" to tell (first process whose name contains "java" or name contains "Minecraft") to set frontmost to true'`);
            }
            catch (error) {
                console.error("Failed to focus Minecraft window:", error);
                return false;
            }
            // Spectate player
            yield typeMinecraftChat("/gamemode spectator");
            yield typeMinecraftChat(`/spectate ${this.bot.username}`);
            // Take screenshot
            const beforeFiles = fs.readdirSync(MC_SCREENSHOT_DIR_PATH);
            yield nut_js_1.keyboard.type(nut_js_1.Key.F2); // Take screenshot
            yield (0, generic_1.asyncSleep)(constants_2.SCREENSHOT_WAIT_MS); // Wait for screenshot to be taken
            const afterFiles = fs.readdirSync(MC_SCREENSHOT_DIR_PATH);
            const newFiles = afterFiles.filter((file) => !beforeFiles.includes(file));
            if (newFiles.length === 0) {
                console.error("No new screenshot file detected");
                return false;
            }
            const screenshotPath = path.join(MC_SCREENSHOT_DIR_PATH, newFiles[0]);
            fs.copyFileSync(screenshotPath, destinationPath); // Copy over to destination path
            // Open the chat again (allowing us to restore the previous app)
            yield nut_js_1.keyboard.type(nut_js_1.Key.T); // Open chat
            yield (0, generic_1.asyncSleep)(constants_2.MC_COMMAND_WAIT_MS); // Wait for chat to open
            // Restore the previously focused application
            console.log("Restoring focus of previous application:", previousApp);
            if (previousApp) {
                try {
                    (0, child_process_1.execSync)(`osascript -e 'tell application id "${previousApp}" to activate'`);
                }
                catch (error) {
                    console.error("Failed to restore previous application:", error);
                }
            }
            return true;
        });
    }
    startOrResumeScreenshotting() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.atCoords);
            (0, assert_1.default)(this.thing);
            // Look at the target thing
            yield this.bot.lookAt(this.atCoords);
            // Take screenshot of bot's POV
            const destinationPath = path.join(this.screenshotDir, `${new Date().toISOString()}_${this.thing.name}.png`);
            let wasSuccess = false;
            if (process.env.USE_COMPUTER_CONTROL_FOR_SCREENSHOT &&
                process.env.USE_COMPUTER_CONTROL_FOR_SCREENSHOT === "true") {
                wasSuccess =
                    yield this.takePOVScreenshotWithComputerControlAndSpectatorMode(destinationPath);
            }
            else {
                wasSuccess = yield this.takePOVScreenshotWithViewer(destinationPath);
            }
            if (wasSuccess) {
                const result = new results_1.TakeScreenshotOfResults.Success(this.thing.name, destinationPath);
                this.resolve(result);
            }
            else {
                const result = new results_1.TakeScreenshotOfResults.Failed(this.thing.name);
                this.resolve(result);
            }
        });
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(thing, atCoordinates) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate thing
            try {
                this.thing = this.bot.thingTypeFactory.createThingType(thing);
            }
            catch (err) {
                if (err instanceof types_1.InvalidThingError) {
                    const result = new results_1.TakeScreenshotOfResults.InvalidThing(thing, thing_type_1.SUPPORTED_THING_TYPES.toString());
                    this.resolve(result);
                    return;
                }
            }
            (0, assert_1.default)(typeof this.thing === "object"); // Obviously true (above), but TS compiler doesn't know this
            // Validate/ascertain atCoords
            if (atCoordinates) {
                this.atCoords = new vec3_1.Vec3(atCoordinates[0], atCoordinates[1], atCoordinates[2]);
                if (!this.thing.isVisibleInImmediateSurroundingsAt(this.atCoords)) {
                    const result = new results_1.TakeScreenshotOfResults.InvalidCoords(thing);
                    this.resolve(result);
                    return;
                }
            }
            else {
                this.atCoords = yield this.thing.locateNearestInImmediateSurroundings();
                if (!this.atCoords) {
                    const result = new results_1.TakeScreenshotOfResults.ThingNotInImmediateSurroundings(thing);
                    this.resolve(result);
                    return;
                }
            }
            // Enter screenshot taking
            yield this.startOrResumeScreenshotting();
        });
    }
    // TODO:
    doPause() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
exports.TakeScreenshotOf = TakeScreenshotOf;
TakeScreenshotOf.TIMEOUT_MS = 18000; // 18 seconds
TakeScreenshotOf.METADATA = {
    name: "takeScreenshotOf",
    signature: "takeScreenshotOf(thing: string, atCoordinates?: [number, number, number])",
    docstring: `
      /**
       * Attempts to take a screenshot of the specified thing, assuming it is in the
       * immediate surroundings.
       * @param thing - The thing to take a screenshot of.
       * @param atCoordinates - Optional coordinates to disambiguate where the
       * thing is located.
       */
    `,
};

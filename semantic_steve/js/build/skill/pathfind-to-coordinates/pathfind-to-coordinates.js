"use strict";
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
exports.PathfindToCoordinates = void 0;
const assert_1 = __importDefault(require("assert"));
const vec3_1 = require("vec3");
const mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
const results_1 = require("./results");
const thing_1 = require("../../thing");
const types_1 = require("../../types");
const skill_1 = require("../skill");
const utils_1 = require("./utils");
const STOP_IF_FOUND_CHECK_THROTTLE_MS = 1800;
class PathfindToCoordinates extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.stopIfFound = [];
        this.activeListeners = [];
    }
    // =======================
    // Begin/stop pathfinding
    // =======================
    beginPathfinding() {
        (0, assert_1.default)(this.targetCoords);
        this.setupListeners();
        const goal = new mineflayer_pathfinder_1.goals.GoalBlock(this.targetCoords.x, this.targetCoords.y, this.targetCoords.z);
        this.bot.pathfinder.setGoal(goal);
        console.log("Goal set. Beginning pathfinding...");
    }
    stopPathfindingPrematurely() {
        (0, assert_1.default)(this.targetCoords);
        this.bot.pathfinder.stop();
        this.cleanupListeners();
    }
    // ==============
    // Misc. helpers
    // ==============
    unsetPathfindingParams() {
        this.targetCoords = undefined;
        this.stopIfFound = [];
    }
    /**
     * Checks the bot's surroundings for any of the things in the stopIfFound list.
     * If any of them are found, it returns appropriate result. Otherwise, it returns undefined.
     * @returns The result of the check, or undefined if no stopIfFound things are found.
     */
    getResultIfAnyStopIfFoundThingInSurroundings() {
        (0, assert_1.default)(this.targetCoords);
        for (const thing of this.stopIfFound) {
            if (thing.isVisibleInImmediateSurroundings()) {
                return new results_1.PathfindToCoordinatesResults.FoundThingInImmediateSurroundings(this.targetCoords, thing.name);
            }
            else if (thing.isVisibleInDistantSurroundings()) {
                return new results_1.PathfindToCoordinatesResults.FoundThingInDistantSurroundings(this.targetCoords, thing.name);
            }
        }
    }
    // ====================
    // Resolvers/listeners
    // ====================
    resolveInvalidCoords(coords) {
        console.log("Resolving pathfinding as invalid coordinates");
        this.onResolution(new results_1.PathfindToCoordinatesResults.InvalidCoords(coords));
    }
    resolveInvalidThing(thingName) {
        console.log("Resolving pathfinding as invalid thing");
        const result = new results_1.PathfindToCoordinatesResults.InvalidThing(thingName, thing_1.SUPPORTED_THING_TYPES.toString());
        this.onResolution(result);
    }
    resolveThingFound(result) {
        console.log("Resolving pathfinding as thing found");
        (0, assert_1.default)(this.targetCoords);
        this.cleanupListeners();
        this.stopPathfindingPrematurely();
        this.unsetPathfindingParams();
        this.onResolution(result);
    }
    resolvePathfindingPartialSuccess() {
        console.log("Resolving pathfinding as partial success");
        (0, assert_1.default)(this.targetCoords);
        this.cleanupListeners();
        const result = new results_1.PathfindToCoordinatesResults.PartialSuccess(this.bot.entity.position, this.targetCoords);
        this.unsetPathfindingParams();
        this.onResolution(result);
    }
    resolvePathfindingSuccess() {
        var _a;
        console.log("Resolving pathfinding as success");
        (0, assert_1.default)(this.targetCoords);
        this.cleanupListeners();
        // NOTE: No throttle since, since we know we always want to hydrate here.
        // (We need to for `getResultIfAnyStopIfFoundThingInSurroundings` and, even if there are
        // no stopIfFound things, we save `onResolution` from having to hydrate it by propagating
        // the optional envStateIsHydrated flag as true.)
        this.bot.envState.hydrate();
        // NOTE: We prefer telling the LLM/user that they stopped early because they found
        // something from stopIfFound, even if they reached their pathfinding goal as well.
        const result = (_a = this.getResultIfAnyStopIfFoundThingInSurroundings()) !== null && _a !== void 0 ? _a : new results_1.PathfindToCoordinatesResults.Success(this.targetCoords);
        this.unsetPathfindingParams();
        this.onResolution(result, true); // NOTE: true = envStateIsHydrated
    }
    checkForStopIfFoundThingsAndHandle(lastMove) {
        if (this.stopIfFound.length === 0) {
            return;
        }
        this.bot.envState.hydrate(STOP_IF_FOUND_CHECK_THROTTLE_MS);
        const result = this.getResultIfAnyStopIfFoundThingInSurroundings();
        if (result) {
            this.resolveThingFound(result);
        }
    }
    checkForTimeoutStatusAndHandle(path) {
        if (path.status === "timeout") {
            console.log("path.status was 'timeout'");
            this.resolvePathfindingPartialSuccess();
        }
    }
    checkForNoPathStatusAndHandle(path) {
        if (path.status === "noPath") {
            console.log("path.status was 'noPath'");
            this.resolvePathfindingPartialSuccess();
        }
    }
    // ===========================
    // Setup/cleanup of listeners
    // ===========================
    setupListener(event, listener) {
        this.bot.on(event, listener);
        this.activeListeners.push({ event, listener });
    }
    setupListeners() {
        console.log("Setting up pathfinding listeners");
        this.setupListener("goal_reached", this.resolvePathfindingSuccess.bind(this));
        this.setupListener("move", this.checkForStopIfFoundThingsAndHandle.bind(this));
        this.setupListener("path_update", this.checkForNoPathStatusAndHandle.bind(this));
        this.setupListener("path_update", this.checkForTimeoutStatusAndHandle.bind(this));
        this.setupListener("path_stop", this.resolvePathfindingPartialSuccess.bind(this));
    }
    cleanupListeners() {
        console.log("Cleaning up pathfinding listeners");
        for (const { event, listener } of this.activeListeners) {
            this.bot.off(event, listener);
        }
        this.activeListeners = []; // Clear the array
    }
    // ==================================
    // Implementation of Skill interface
    // ==================================
    invoke(coords, stopIfFound) {
        return __awaiter(this, void 0, void 0, function* () {
            // Pre-process coordinates
            if (!Array.isArray(coords) || coords.length !== 3) {
                this.resolveInvalidCoords(coords);
                return;
            }
            this.targetCoords = (0, utils_1.getGoodPathfindingTarget)(this.bot, new vec3_1.Vec3(coords[0], coords[1], coords[2]));
            // Pre-process stopIfFound
            this.stopIfFound = [];
            if (stopIfFound === null || stopIfFound === void 0 ? void 0 : stopIfFound.length) {
                for (const thingName of stopIfFound) {
                    try {
                        const thing = this.bot.thingFactory.createThing(thingName);
                        this.stopIfFound.push(thing);
                    }
                    catch (error) {
                        if (error instanceof types_1.InvalidThingError) {
                            this.resolveInvalidThing(thingName);
                            return;
                        }
                    }
                }
            }
            // Begin pathfinding
            this.beginPathfinding();
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Pausing '${PathfindToCoordinates.METADATA.name}'`);
            this.cleanupListeners();
            this.stopPathfindingPrematurely();
            // NOTE: We don't call unsetPathfindingParams (we need to be able to resume)
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.targetCoords);
            console.log(`Resuming '${PathfindToCoordinates.METADATA.name}'`);
            this.beginPathfinding();
        });
    }
}
exports.PathfindToCoordinates = PathfindToCoordinates;
PathfindToCoordinates.TIMEOUT_MS = 25000; // 25 seconds
PathfindToCoordinates.METADATA = {
    name: "pathfindToCoordinates",
    signature: "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])",
    docstring: `
      /**
       * Attempt to pathfind to or near a set of in-dimension coordinates (digging and
       * bridging as needed), stopping early if something from the stopIfFound list
       * becomes visible in the bot's surroundings.
       *
       * TIP: Do not call this function with very distant coordinates, as this will likely
       * result in a timeout. Instead, prefer incremental invocations of this skill for
       * traversing long distances.
       *
       * @param coordinates - The target coordinates as an array ordered [x, y, z].
       * @param stopIfFound - An optional array of strings representing things that, if
       * found, should cause the pathdinding to stop (e.g., useful things).
       */
    `,
};

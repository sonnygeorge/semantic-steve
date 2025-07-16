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
const thing_type_1 = require("../../thing-type");
const types_1 = require("../../types");
const skill_1 = require("../skill");
const misc_1 = require("../../utils/misc");
const constants_1 = require("../../constants");
class PathfindingParams {
    constructor(bot, targetCoords, stopIfFound) {
        this.targetCoords = targetCoords;
        this.stopIfFound = stopIfFound;
        const blockAtTargetCoords = bot.world.getBlock(targetCoords.floor());
        if (blockAtTargetCoords !== null && blockAtTargetCoords.name !== "air") {
            this.goal = new mineflayer_pathfinder_1.goals.GoalGetToBlock(targetCoords.x, targetCoords.y, targetCoords.z);
        }
        else {
            this.goal = new mineflayer_pathfinder_1.goals.GoalBlock(targetCoords.x, targetCoords.y, targetCoords.z);
        }
    }
}
class PathfindToCoordinates extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.activeListeners = [];
    }
    // =======================
    // Begin/stop pathfinding
    // =======================
    beginPathfinding() {
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        this.setupListeners();
        this.bot.pathfinder.setGoal(this.pathingParams.goal);
        console.log("Goal set. Beginning pathfinding...");
    }
    manuallyStopPathfinder() {
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        console.log("Manually stopping pathfinder...");
        this.bot.pathfinder.stop();
        this.cleanupListeners();
    }
    // ==============
    // Misc. helpers
    // ==============
    /**
     * Checks the bot's surroundings for any of the things in the stopIfFound list.
     * If any of them are found, it returns appropriate result. Otherwise, it returns undefined.
     * @returns The result of the check, or undefined if no stopIfFound things are found.
     */
    getResultIfAnyStopIfFoundThingInSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            for (const thing of this.pathingParams.stopIfFound) {
                if (yield thing.isVisibleInImmediateSurroundings()) {
                    return new results_1.PathfindToCoordinatesResults.FoundThingInImmediateSurroundings(this.pathingParams.targetCoords, thing.name);
                }
                else if (yield thing.isVisibleInDistantSurroundings()) {
                    return new results_1.PathfindToCoordinatesResults.FoundThingInDistantSurroundings(this.pathingParams.targetCoords, thing.name);
                }
            }
        });
    }
    // ====================
    // Resolvers/listeners
    // ====================
    resolveInvalidCoords(coords) {
        console.log("Resolving pathfinding as invalid coordinates");
        this.resolve(new results_1.PathfindToCoordinatesResults.InvalidCoords(coords));
    }
    resolveInvalidThing(thingName) {
        console.log("Resolving pathfinding as invalid thing");
        const result = new results_1.PathfindToCoordinatesResults.InvalidThing(thingName, thing_type_1.SUPPORTED_THING_TYPES.toString());
        this.resolve(result);
    }
    resolveThingFound(result) {
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        console.log("Resolving pathfinding as thing found");
        this.cleanupListeners();
        this.manuallyStopPathfinder();
        this.pathingParams = undefined;
        this.resolve(result);
    }
    resolvePathfindingPartialSuccess() {
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        console.log("Resolving pathfinding as partial success");
        this.cleanupListeners();
        const result = new results_1.PathfindToCoordinatesResults.PartialSuccess(this.bot.entity.position, this.pathingParams.targetCoords);
        this.pathingParams = undefined;
        this.resolve(result);
    }
    resolvePathfindingSuccess() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            console.log("Resolving pathfinding as success");
            this.cleanupListeners();
            // NOTE: We prefer telling the LLM/user that they stopped early because they found
            // something from stopIfFound, even if they reached their pathfinding goal as well.
            const result = (_a = (yield this.getResultIfAnyStopIfFoundThingInSurroundings())) !== null && _a !== void 0 ? _a : new results_1.PathfindToCoordinatesResults.Success(this.pathingParams.targetCoords);
            this.pathingParams = undefined;
            this.resolve(result);
        });
    }
    checkForStopIfFoundThingsAndHandle(lastMove) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            if (this.pathingParams.stopIfFound.length === 0) {
                return;
            }
            const result = yield this.getResultIfAnyStopIfFoundThingInSurroundings();
            if (result) {
                this.resolveThingFound(result);
            }
        });
    }
    checkForStatusWeShouldManuallyStopAndResolveOn(path) {
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        if (path.status === "timeout" || path.status === "noPath") {
            console.log(`path.status was '${path.status}'`);
            // This stops the bot from continuing to move along the remainder of partial path
            this.manuallyStopPathfinder();
            if (this.bot.envState.surroundings.getVicinityForPosition(this.pathingParams.targetCoords) === types_1.VicinityName.IMMEDIATE_SURROUNDINGS) {
                this.resolvePathfindingSuccess();
            }
            else {
                this.resolvePathfindingPartialSuccess();
            }
        }
    }
    handlePathStop() {
        var _a;
        (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
        // As far as I know in my study of mineflayer-pathfinder, 'path_stop' is only emitted
        // in these cases:
        // - When a goal becomes invalid
        // - The pathfind module user calls `pathfinder.stop()`
        // We only want to resolve when the goal becomes invalid, since, e.g. on skill pause
        // (which can result in a 'path_stop' emission), we don't want to resolve the skill.
        if (!((_a = this.pathingParams.goal) === null || _a === void 0 ? void 0 : _a.isValid())) {
            if (this.bot.envState.surroundings.getVicinityForPosition(this.pathingParams.targetCoords) === types_1.VicinityName.IMMEDIATE_SURROUNDINGS) {
                this.resolvePathfindingSuccess();
            }
            else {
                this.resolvePathfindingPartialSuccess();
            }
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
        this.setupListener("path_update", this.checkForStatusWeShouldManuallyStopAndResolveOn.bind(this));
        this.setupListener("path_stop", this.handlePathStop.bind(this));
    }
    cleanupListeners() {
        console.log("Cleaning up pathfinding listeners");
        for (const { event, listener } of this.activeListeners) {
            this.bot.off(event, listener);
        }
        this.activeListeners = []; // Clear the local-state array
    }
    // ============================
    // Implementation of Skill API
    // ============================
    doInvoke(coords, stopIfFound) {
        return __awaiter(this, void 0, void 0, function* () {
            // Pre-process coordinates
            if (Array.isArray(coords)) {
                coords = new vec3_1.Vec3(coords[0], coords[1], coords[2]);
            }
            const { minY: dimensionBottom, maxY: dimensionTop } = (0, misc_1.getCurrentDimensionYLimits)(this.bot);
            if (coords.x < -30000000 ||
                coords.x > 30000000 ||
                coords.y < dimensionBottom ||
                coords.y > dimensionTop ||
                coords.z < -30000000 ||
                coords.z > 30000000) {
                this.resolveInvalidCoords([coords.x, coords.y, coords.z]);
                return;
            }
            // Pre-process stopIfFound
            const processedStopIfFound = [];
            if (stopIfFound === null || stopIfFound === void 0 ? void 0 : stopIfFound.length) {
                for (const thingName of stopIfFound) {
                    try {
                        const thing = this.bot.thingTypeFactory.createThingType(thingName);
                        processedStopIfFound.push(thing);
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
            this.pathingParams = new PathfindingParams(this.bot, coords, processedStopIfFound);
            this.beginPathfinding();
        });
    }
    doPause() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            this.cleanupListeners();
            this.manuallyStopPathfinder();
            // NOTE: We don't call unsetPathfindingParams (we need to be able to resume)
        });
    }
    doResume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            this.beginPathfinding();
        });
    }
    doStop() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.pathingParams, "Shouldn't be called w/out set pathing params");
            this.cleanupListeners();
            this.manuallyStopPathfinder();
            this.pathingParams = undefined;
        });
    }
}
exports.PathfindToCoordinates = PathfindToCoordinates;
PathfindToCoordinates.TIMEOUT_MS = constants_1.MAX_ALLOWED_PATHFINDING_TIME_MS;
PathfindToCoordinates.METADATA = {
    name: "pathfindToCoordinates",
    signature: "pathfindToCoordinates(coordinates: [number, number, number], stopIfFound?: string[])",
    docstring: `
      /**
       * Attempts to pathfind to or near a set of in-dimension coordinates (digging and
       * bridging as needed), stopping early if something from the stopIfFound list
       * becomes visible in the bot's surroundings.
       *
       * TIP: Do not call this function with very distant coordinates, as this will likely
       * result in a timeout. Instead, prefer incremental invocations of this skill for
       * traversing long distances.
       * TIP: Use this function to dig down by calling it with coordinates below the bot's
       * current Y level.
       *
       * @param coordinates - The target coordinates as an array ordered [x, y, z].
       * @param stopIfFound - An optional array of strings representing things that, if
       * found, should cause the pathdinding to stop (e.g., useful things).
       */
    `,
};

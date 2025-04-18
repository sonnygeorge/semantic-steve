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
exports.Approach = void 0;
const assert_1 = __importDefault(require("assert"));
const pathfind_to_coordinates_1 = require("../pathfind-to-coordinates/pathfind-to-coordinates");
const types_1 = require("../../env-state/surroundings/types");
const results_1 = require("./results");
const thing_1 = require("../../thing");
const skill_1 = require("../skill");
const thing_2 = require("../../thing");
class Approach extends skill_1.Skill {
    constructor(bot, onResolution) {
        super(bot, onResolution);
        this.pathfindToCoordinates = new pathfind_to_coordinates_1.PathfindToCoordinates(bot, this.resolveNaturally.bind(this));
    }
    resolveNaturally(result, envStateIsHydrated) {
        (0, assert_1.default)(this.thing);
        (0, assert_1.default)(this.targetThingCoords);
        (0, assert_1.default)(this.direction);
        const vicinityOfTargetThing = this.bot.envState.surroundings.getVicinityForPosition(this.targetThingCoords);
        if (vicinityOfTargetThing == types_1.Vicinity.IMMEDIATE_SURROUNDINGS) {
            const successResult = new results_1.ApproachResults.Success(this.thing.name, this.direction);
            this.onResolution(successResult, envStateIsHydrated);
        }
        else {
            const failureResult = new results_1.ApproachResults.Failure(this.thing.name, result.message);
            this.onResolution(failureResult, envStateIsHydrated);
        }
    }
    // ==================================
    // Implementation of Skill interface
    // ==================================
    invoke(thing, direction) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                this.thing = this.bot.thingFactory.createThing(thing);
            }
            catch (err) {
                if (err instanceof thing_1.InvalidThingError) {
                    const result = new results_1.ApproachResults.InvalidThing(thing, thing_2.SUPPORTED_THING_TYPES);
                    this.onResolution(result);
                    return;
                }
            }
            if (!Object.values(types_1.Direction).includes(direction)) {
                const result = new results_1.ApproachResults.InvalidDirection(direction);
                this.onResolution(result);
                return;
            }
            this.direction = direction;
            // Make sure we have fresh environment state data
            this.bot.envState.hydrate();
            // Check if the thing is visible in distant surroundings in given direction and get its coordinates
            this.targetThingCoords =
                yield ((_a = this.thing) === null || _a === void 0 ? void 0 : _a.locateNearestInDistantSurroundings(this.direction));
            if (!this.targetThingCoords) {
                const result = new results_1.ApproachResults.ThingNotInDistantSurroundingsDirection(thing, direction);
                return;
            }
            yield this.pathfindToCoordinates.invoke([
                this.targetThingCoords.x,
                this.targetThingCoords.y,
                this.targetThingCoords.z,
            ]);
        });
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Pausing '${Approach.METADATA.name}'`);
            yield this.pathfindToCoordinates.pause();
        });
    }
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Resuming '${Approach.METADATA.name}'`);
            yield this.pathfindToCoordinates.resume();
        });
    }
}
exports.Approach = Approach;
Approach.TIMEOUT_MS = 23000; // 23 seconds
Approach.METADATA = {
    name: "approach",
    signature: "approach(thing: string)",
    docstring: `
      /**
       * Attempt to pathfind to something visible in a direction of the bot's distant
       * surroundings.
       * 
       * @param thing - The name of the thing to approach.
       * @param direction - The direction of the distant surroundings in which the thing
       * you want to approach is located.
       */
    `,
};

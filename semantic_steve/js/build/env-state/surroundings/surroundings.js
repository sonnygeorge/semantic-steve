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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surroundings = void 0;
const types_1 = require("../../types");
const vicinity_1 = require("./vicinity");
const classify_vicinity_1 = require("./classify-vicinity");
class Surroundings {
    constructor(bot, radii) {
        this.bot = bot;
        this.vicinitiesObserver = new vicinity_1.VicinitiesObserver(bot, radii);
        this.immediate = this.vicinitiesObserver.immediate;
        this.distant = this.vicinitiesObserver.distant;
        this.radii = this.vicinitiesObserver.radii;
    }
    beginObservation() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.vicinitiesObserver.beginObservation();
        });
    }
    *iterVicinities() {
        yield this.immediate;
        for (const direction of Object.values(types_1.DirectionName)) {
            yield this.distant.get(direction);
        }
    }
    getVicinityForPosition(position) {
        return (0, classify_vicinity_1.classifyVicinityOfPosition)(position, this.bot.entity.position, this.radii.immediateSurroundingsRadius, this.radii.distantSurroundingsRadius);
    }
    getDTO() {
        return __awaiter(this, void 0, void 0, function* () {
            const distantDTOs = new Map();
            for (const direction of Object.values(types_1.DirectionName)) {
                distantDTOs.set(direction, yield this.distant.get(direction).getDTO());
            }
            return {
                immediateSurroundings: yield this.immediate.getDTO(),
                distantSurroundings: Object.fromEntries(distantDTOs.entries()),
            };
        });
    }
}
exports.Surroundings = Surroundings;

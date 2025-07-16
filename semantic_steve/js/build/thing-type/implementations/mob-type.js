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
exports.MobType = void 0;
const types_1 = require("../../types");
const constants_1 = require("../../constants");
class MobType {
    constructor(bot, name) {
        const entity = bot.registry.entitiesByName[name];
        if (!entity || !constants_1.MOB_ENTITY_TYPES.includes(entity.type)) {
            throw new types_1.InvalidThingError(`Invalid mob entity type: ${name}.`);
        }
        this.name = name;
        this.bot = bot;
    }
    // ================================
    // Implementation of ThingType API
    // ================================
    isVisibleInImmediateSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const entityName of this.bot.envState.surroundings.immediate.visible.getDistinctMobNames()) {
                if (entityName === this.name) {
                    return true;
                }
            }
            return false;
        });
    }
    isVisibleInDistantSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const dir of this.bot.envState.surroundings.distant.values()) {
                for (const entityName of dir.visible.getDistinctMobNames()) {
                    if (entityName === this.name) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    locateNearest() {
        return __awaiter(this, void 0, void 0, function* () {
            // Try immediate surroundings first
            const immediateResult = this.locateNearestInImmediateSurroundings();
            if (immediateResult) {
                return immediateResult;
            }
            // If not found in immediate surroundings, try distant surroundings
            return this.locateNearestInDistantSurroundings();
        });
    }
    locateNearestInImmediateSurroundings() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [name, closestCoords,] of this.bot.envState.surroundings.immediate.visible.getMobNamesToClosestCoords()) {
                if (name === this.name) {
                    return closestCoords.clone();
                }
            }
        });
    }
    locateNearestInDistantSurroundings(direction) {
        return __awaiter(this, void 0, void 0, function* () {
            // If a specific direction is provided, check only that direction
            if (direction) {
                const vicinity = this.bot.envState.surroundings.distant.get(direction);
                for (const [name, closestCoords,] of vicinity.visible.getMobNamesToClosestCoords()) {
                    if (name === this.name) {
                        return closestCoords.clone();
                    }
                }
                return undefined; // Not found in the specified direction
            }
            // If no direction specified, find the closest coordinates across all directions
            let closestOfClosestCoords = undefined;
            let smallestDistance = Infinity;
            for (const vicinity of this.bot.envState.surroundings.distant.values()) {
                for (const [name, closestCoords,] of vicinity.visible.getMobNamesToClosestCoords()) {
                    if (name === this.name) {
                        const distance = this.bot.entity.position.distanceTo(closestCoords);
                        if (distance < smallestDistance) {
                            smallestDistance = distance;
                            closestOfClosestCoords = closestCoords.clone();
                        }
                        break;
                    }
                }
            }
            return closestOfClosestCoords;
        });
    }
    isVisibleInImmediateSurroundingsAt(position) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Writing code that relies on constantly-moving mobs being in a specific " +
                "position probably shouldn't be written.");
        });
    }
}
exports.MobType = MobType;

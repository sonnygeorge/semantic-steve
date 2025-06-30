"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemType = void 0;
const types_1 = require("../../types");
class ItemType {
    constructor(bot, name, id) {
        if (name) {
            const itemEntityNames = Object.values(bot.registry.itemsByName).map((i) => i.name);
            if (!itemEntityNames.includes(name)) {
                throw new types_1.InvalidThingError(`Invalid item entity type: ${name}.`);
            }
            this.name = name;
            this.id = bot.registry.itemsByName[name].id;
        }
        else if (id) {
            const itemEntityIds = Object.values(bot.registry.items).map((i) => i.id);
            if (!itemEntityIds.includes(id)) {
                throw new types_1.InvalidThingError(`Invalid item entity id: ${id}.`);
            }
            this.id = id;
            this.name = bot.registry.items[id].name;
        }
        else {
            throw new Error("Either name or id must be provided to create an ItemEntity.");
        }
        this.bot = bot;
    }
    // ======================
    // Item-specific methods
    // ======================
    getTotalCountInInventory() {
        return this.bot.envState.inventory.itemsToTotalCounts.get(this.name) || 0;
    }
    // ================================
    // Implementation of ThingType API
    // ================================
    isVisibleInImmediateSurroundings() {
        for (const itemName of this.bot.envState.surroundings.immediate.visible.getDistinctItemNames()) {
            if (itemName === this.name) {
                return true;
            }
        }
        return false;
    }
    isVisibleInDistantSurroundings() {
        for (const dir of this.bot.envState.surroundings.distant.values()) {
            for (const itemName of dir.visible.getDistinctItemNames()) {
                if (itemName === this.name) {
                    return true;
                }
            }
        }
        return false;
    }
    locateNearest() {
        // Try immediate surroundings first
        const immediateResult = this.locateNearestInImmediateSurroundings();
        if (immediateResult) {
            return immediateResult;
        }
        // If not found in immediate surroundings, try distant surroundings
        return this.locateNearestInDistantSurroundings();
    }
    locateNearestInImmediateSurroundings() {
        for (const [name, closestCoords,] of this.bot.envState.surroundings.immediate.visible.getItemNamesToClosestCoords()) {
            if (name === this.name) {
                return closestCoords.clone();
            }
        }
    }
    locateNearestInDistantSurroundings(direction) {
        // If a specific direction is provided, check only that direction
        if (direction) {
            const vicinity = this.bot.envState.surroundings.distant.get(direction);
            for (const [name, closestCoords,] of vicinity.visible.getItemNamesToClosestCoords()) {
                if (name === this.name) {
                    return closestCoords.clone();
                }
            }
            return undefined; // Not found in the specified direction
        }
        // If no direction specified, check all directions
        const directions = Array.from(this.bot.envState.surroundings.distant.keys());
        // Find the closest coordinates across all directions
        let closestOfClosestCoords = undefined;
        let smallestDistance = Infinity;
        for (const dir of directions) {
            const vicinity = this.bot.envState.surroundings.distant.get(dir);
            for (const [name, closestCoords,] of vicinity.visible.getItemNamesToClosestCoords()) {
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
    }
    isVisibleInImmediateSurroundingsAt(coords) {
        for (const [name, coordsIterable,] of this.bot.envState.surroundings.immediate.visible.getItemNamesToAllCoords()) {
            if (name === this.name) {
                for (const itemCoords of coordsIterable) {
                    if (itemCoords.equals(coords)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
exports.ItemType = ItemType;

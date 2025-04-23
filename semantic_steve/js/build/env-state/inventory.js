"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
const durability_1 = require("../utils/durability");
/**
 * Inventory class that wraps the bot's inventory and provides additional functionality
 * for managing and querying the inventory.
 */
class Inventory {
    constructor(bot) {
        this.bot = bot;
    }
    /**
     * Only the slots with items.
     *
     * (wrapper around the this.bot.inventory.slots to filter out null values)
     */
    get itemSlots() {
        return this.bot.inventory.slots.filter((item) => item !== null);
    }
    /**
     * Map of item names to their corresponding PItem objects.
     */
    get itemsToSlots() {
        return new Map(this.itemSlots.map((item) => [item.name, item]));
    }
    /**
     * Map of item names to their total counts in the inventory.
     */
    get itemsToTotalCounts() {
        const itemTotals = new Map();
        this.itemSlots.map((item) => {
            const currentCount = itemTotals.get(item.name) || 0;
            itemTotals.set(item.name, currentCount + item.count);
        });
        return itemTotals;
    }
    /**
     * Returns an array of `InventoryItemDTO` objects.
     */
    getDTO() {
        return this.itemSlots.map((item) => ({
            name: item.name,
            count: item.count,
            durabilityRemaining: (0, durability_1.getDurabilityRemainingString)(item),
        }));
    }
}
exports.Inventory = Inventory;

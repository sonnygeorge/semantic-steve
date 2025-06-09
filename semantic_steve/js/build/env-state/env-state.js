"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvState = void 0;
const surroundings_1 = require("./surroundings");
const inventory_1 = require("./inventory");
// TODO: Daytime/nightime?
var EquipmentDestination;
(function (EquipmentDestination) {
    EquipmentDestination["HAND"] = "hand";
    EquipmentDestination["OFF_HAND"] = "off-hand";
    EquipmentDestination["FEET"] = "feet";
    EquipmentDestination["LEGS"] = "legs";
    EquipmentDestination["TORSO"] = "torso";
    EquipmentDestination["HEAD"] = "head";
})(EquipmentDestination || (EquipmentDestination = {}));
const MINEFLAYER_EQUIPMENT_DESTINATION_ORDER = [
    "hand",
    "off-hand",
    "feet",
    "legs",
    "torso",
    "head",
];
class EnvState {
    constructor(bot, surroundingsRadii) {
        this.bot = bot;
        this.surroundings = new surroundings_1.Surroundings(bot, surroundingsRadii);
        this.inventory = new inventory_1.Inventory(bot);
    }
    get botCoords() {
        return this.bot.entity.position;
    }
    get health() {
        return this.bot.health;
    }
    get hunger() {
        return this.bot.food;
    }
    get equipped() {
        const equipped = {};
        for (let i = 0; i < MINEFLAYER_EQUIPMENT_DESTINATION_ORDER.length; i++) {
            equipped[MINEFLAYER_EQUIPMENT_DESTINATION_ORDER[i]] =
                this.bot.entity.equipment[i];
        }
        return equipped;
    }
    getDTO() {
        return {
            playerCoordinates: [
                // Round to 1 decimal place
                Math.round(this.botCoords.x * 10) / 10,
                Math.round(this.botCoords.y * 10) / 10,
                Math.round(this.botCoords.z * 10) / 10,
            ],
            health: `${this.health}/20`, // NOTE: 20 is the max health in vanilla Minecraft
            hunger: `${this.hunger}/20`, // NOTE: 20 is the max hunger in vanilla Minecraft
            inventory: this.inventory.getDTO(),
            equipped: Object.fromEntries(Object.entries(this.equipped).map(([key, item]) => {
                var _a;
                return [
                    key,
                    (_a = item === null || item === void 0 ? void 0 : item.name) !== null && _a !== void 0 ? _a : null,
                ];
            })),
            surroundings: this.surroundings.getDTO(),
        };
    }
}
exports.EnvState = EnvState;

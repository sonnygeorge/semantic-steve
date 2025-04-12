"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skill = void 0;
exports.buildSkillsRegistry = buildSkillsRegistry;
const skill_1 = require("./skill");
Object.defineProperty(exports, "Skill", { enumerable: true, get: function () { return skill_1.Skill; } });
const pathfind_to_coordinates_1 = require("./pathfind-to-coordinates");
function buildSkillsRegistry(bot, onResolution) {
    return {
        [pathfind_to_coordinates_1.PathfindToCoordinates.metadata.name]: new pathfind_to_coordinates_1.PathfindToCoordinates(bot, onResolution),
    };
}

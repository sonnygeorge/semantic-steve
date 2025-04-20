"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlock = isBlock;
exports.blockExistsAt = blockExistsAt;
function isBlock(block, allowedBoundingBoxes) {
    if (block === null || block.type === 0) {
        return false;
    }
    let isAnAllowedBoundBox = true;
    if (allowedBoundingBoxes) {
        isAnAllowedBoundBox = allowedBoundingBoxes.includes(block.boundingBox);
    }
    return isAnAllowedBoundBox;
}
function blockExistsAt(bot, coords, allowedBoundingBoxes) {
    const block = bot.blockAt(coords);
    return isBlock(block, allowedBoundingBoxes);
}

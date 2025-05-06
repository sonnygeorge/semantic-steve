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
exports.SelfPreserver = void 0;
/**
 * SelfPreserver monitors the bot's environment and health to trigger self-preservation actions when needed.
 * It periodically checks for threats and dangerous conditions and can interrupt normal operation
 * to execute survival behaviors.
 */
class SelfPreserver {
    /**
     * Creates a new SelfPreserver instance.
     * @param bot - The Mineflayer bot instance to monitor and protect.
     * @param checkThrottleMS - The interval in milliseconds between environment checks.
     */
    constructor(bot, checkThrottleMS) {
        this.bot = bot;
        this.checkThrottleMS = checkThrottleMS;
    }
    /**
     * Checks if the bot should self-preserve based on its current environment and health.
     * This method should be called periodically to determine if self-preservation actions are needed.
     * @returns {boolean} - True if self-preservation is needed, false otherwise.
     */
    shouldSelfPreserve() {
        // this.bot.envState.hydrate(this.CheckThrottleMS);
        // TODO: Check hydrated envState for threatening mobs, low hunger, drowning, etc.
        return false; // FIXME
    }
    invoke() {
        return __awaiter(this, void 0, void 0, function* () {
            return ""; // TODO: Implement self-preservation (and returning of results?)
        });
    }
}
exports.SelfPreserver = SelfPreserver;

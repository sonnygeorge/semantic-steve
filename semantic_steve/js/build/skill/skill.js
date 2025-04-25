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
exports.Skill = exports.SkillStatus = void 0;
const assert_1 = __importDefault(require("assert"));
var SkillStatus;
(function (SkillStatus) {
    SkillStatus["PENDING_INVOCATION"] = "PENDING_INVOCATION";
    SkillStatus["ACTIVE_RUNNING"] = "ACTIVE_RUNNING";
    SkillStatus["ACTIVE_PAUSED"] = "ACTIVE_PAUSED";
    SkillStatus["STOPPED"] = "STOPPED";
})(SkillStatus || (exports.SkillStatus = SkillStatus = {}));
/**
 * The interface that all skills must implement.
 */
class Skill {
    constructor(bot, onResolution) {
        this.bot = bot;
        this.onResolution = onResolution;
        this.status = SkillStatus.PENDING_INVOCATION;
    }
    resolve(result, envStateIsHydrated) {
        (0, assert_1.default)(this.status === SkillStatus.ACTIVE_RUNNING ||
            this.status === SkillStatus.STOPPED, `Skill must be in ACTIVE or STOPPED state to resolve, but was in ${this.status}`);
        this.status = SkillStatus.PENDING_INVOCATION;
        setTimeout(() => {
            this.onResolution(result, envStateIsHydrated);
        }, 0);
    }
    /**
     * Invokes the skill with the given arguments.
     * Requires that the skill be in the PENDING_INVOCATION state and immediately sets the
     * status to ACTIVE_RUNNING.
     */
    invoke(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.status === SkillStatus.PENDING_INVOCATION, `Skill must be in PENDING_INVOCATION state to invoke, but was in ${this.status}`);
            this.status = SkillStatus.ACTIVE_RUNNING;
            yield this.doInvoke(...args);
        });
    }
    /**
     * Pauses an active skill.
     * Requires that the skill be in the ACTIVE state and immediately sets the
     * status to ACTIVE_PAUSED.
     */
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.status === SkillStatus.ACTIVE_RUNNING, `Skill must be in ACTIVE state to pause, but was in ${this.status}`);
            this.status = SkillStatus.ACTIVE_PAUSED;
            yield this.doPause();
        });
    }
    /**
     * Resumes a paused skill.
     * Requires that the skill be in the ACTIVE_PAUSED state and immediately sets the
     * status to ACTIVE_RUNNING.
     */
    resume() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.status === SkillStatus.ACTIVE_PAUSED, `Skill must be in PAUSED state to resume, but was in ${this.status}`);
            this.status = SkillStatus.ACTIVE_RUNNING;
            yield this.doResume();
        });
    }
    /**
     * Stops a skill.
     * Requires that the skill be in the ACTIVE_RUNNING or ACTIVE_PAUSED state and
     * immediately sets the status to STOPPED.
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, assert_1.default)(this.status === SkillStatus.ACTIVE_RUNNING ||
                this.status === SkillStatus.ACTIVE_PAUSED, `Skill must be in ACTIVE or PAUSED state to stop, but was in ${this.status}`);
            this.status = SkillStatus.STOPPED;
            yield this.doStop();
        });
    }
}
exports.Skill = Skill;
Skill.TIMEOUT_MS = 40000;

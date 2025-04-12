"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.SemanticSteve = exports.SemanticSteveConfig = void 0;
const zmq = __importStar(require("zeromq"));
const assert_1 = __importDefault(require("assert"));
const skill_results_1 = require("./skill-results");
const self_preserver_1 = require("./self-preserver");
const skill_1 = require("./skill");
class SemanticSteveConfig {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f;
        this.selfPreservationCheckThrottleMS =
            (_a = options.selfPreservationCheckThrottleMS) !== null && _a !== void 0 ? _a : 1500;
        this.immediateSurroundingsRadius = (_b = options.immediateSurroundingsRadius) !== null && _b !== void 0 ? _b : 5;
        this.distantSurroundingsRadius = (_c = options.distantSurroundingsRadius) !== null && _c !== void 0 ? _c : 13;
        this.botPort = (_d = options.botPort) !== null && _d !== void 0 ? _d : 25565;
        this.mfViewerPort = (_e = options.mfViewerPort) !== null && _e !== void 0 ? _e : 3000;
        this.zmqPort = (_f = options.zmqPort) !== null && _f !== void 0 ? _f : 5555;
    }
}
exports.SemanticSteveConfig = SemanticSteveConfig;
class SemanticSteve {
    constructor(bot, config = new SemanticSteveConfig()) {
        this.inventoryAtTimeOfCurrentSkillInvocation = undefined; // Not implemented (placeholder)
        this.hasDiedWhileAwaitingInvocation = false;
        this.bot = bot;
        this.socket = new zmq.Pair({ receiveTimeout: 0 });
        this.zmqPort = config.zmqPort;
        this.selfPreserver = new self_preserver_1.SelfPreserver(this.bot, config.selfPreservationCheckThrottleMS);
        // Skills setup
        this.skills = (0, skill_1.buildSkillsRegistry)(this.bot, this.handleSkillResolution.bind(this));
    }
    // =======================================
    // Sending and receiving data from Python
    // =======================================
    sendDataToPython(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.socket.send(JSON.stringify(data));
        });
    }
    checkForMsgFromPython() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [msgFromPython] = yield this.socket.receive();
                return msgFromPython.toString();
            }
            catch (e) {
                (0, assert_1.default)(e && typeof e === "object" && "code" in e);
                (0, assert_1.default)(e.code === "EAGAIN");
            }
        });
    }
    // ================================
    // Skill invocation and resolution
    // ================================
    invokeSkill(skillInvocation) {
        const skillToInvoke = this.skills[skillInvocation.skillName];
        // Add skill invocation to the macrotask queue (wrapped w/ handling of errors)
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield skillToInvoke.invoke(...skillInvocation.args);
            }
            catch (error) {
                const result = new skill_results_1.GenericSkillResults.UnhandledRuntimeError(skillInvocation.skillName, error);
                this.handleSkillResolution(result);
            }
        }), 0);
        // Set fields that are to be set while skills are running
        this.currentSkill = skillToInvoke;
        this.inventoryAtTimeOfCurrentSkillInvocation = undefined; // Not implemented (placeholder)
    }
    // Not implemented (placeholder)
    getInventoryChangesSinceCurrentSkillWasInvoked() {
        // TODO: Compare current inventory with `this.inventoryAtTimeOfCurrentSkillInvocation`
    }
    handleSkillResolution(result, 
    // NOTE: Although worrying about this isn't their responsability, `Skill`s can
    // propogate this flag if they have _just barely_ hydrated the envState
    envStateIsHydrated) {
        // Hydrate the envState if it wasn't just hydrated by a skill
        if (!envStateIsHydrated) {
            this.bot.envState.hydrate();
        }
        // Get Inventory changes since the skill was invoked
        const invChanges = this.getInventoryChangesSinceCurrentSkillWasInvoked();
        // Unset fields that are only to be set while skills are running
        this.currentSkill = undefined;
        this.inventoryAtTimeOfCurrentSkillInvocation = undefined;
        // Prepare the data to send to Python
        // TODO: Add invChanges to what we send to Python once getting this (maybe someday) gets implemented
        const toSendToPython = {
            envState: this.bot.envState.getDTO(),
            skillInvocationResults: result.message,
        };
        this.sendDataToPython(toSendToPython);
    }
    // ==============
    // Other helpers
    // ==============
    initializeSocket() {
        return __awaiter(this, void 0, void 0, function* () {
            // Now we bind and properly await it
            yield this.socket.bind(`tcp://*:${this.zmqPort}`);
        });
    }
    getAndSendInitialState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.bot.envState.surroundings.hydrate();
            let toSendToPython = {
                envState: this.bot.envState.getDTO(),
                // NOTE: No skill invocation results yet
            };
            yield this.sendDataToPython(toSendToPython);
        });
    }
    handleDeath() {
        if (!this.currentSkill) {
            // We don't have a current skill, therefore, we are awaiting an invocation from Python
            // Set this flag so that, once we receive an invocation, we can immediately respond w/
            // DeathBeforeInvocation
            this.hasDiedWhileAwaitingInvocation = true;
        }
        else {
            // We have a current skill, therefore, we are in the middle of executing a skill
            // Terminate the skill by stopping its execution and unsetting this.currentSkill
            this.currentSkill.pause();
            this.currentSkill = undefined;
            // Now we resolve the skill with a DeathDuringExecution result
            const result = new skill_results_1.GenericSkillResults.DeathDuringExecution();
            this.handleSkillResolution(result);
        }
    }
    // ===========================
    // Main entrypoint/run method
    // ===========================
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initializeSocket();
            yield this.getAndSendInitialState();
            this.bot.once("death", () => {
                this.handleDeath();
            });
            while (true) {
                const msgFromPython = yield this.checkForMsgFromPython();
                if (msgFromPython) {
                    (0, assert_1.default)(!this.currentSkill, "Got invocation before resolution");
                    const skillInvocation = JSON.parse(msgFromPython);
                    if (this.hasDiedWhileAwaitingInvocation) {
                        this.hasDiedWhileAwaitingInvocation = false; // Reset the flag
                        const result = new skill_results_1.GenericSkillResults.DeathWhileAwaitingInvocation(skillInvocation.skillName);
                        this.handleSkillResolution(result);
                    }
                    else if (skillInvocation.skillName in this.skills) {
                        this.invokeSkill(skillInvocation);
                    }
                    else {
                        const result = new skill_results_1.GenericSkillResults.SkillNotFound(skillInvocation.skillName);
                        this.handleSkillResolution(result);
                    }
                }
                // 10 ms non-blocking sleep to allow current skill to run / avoid busy-waiting
                yield new Promise((res) => setTimeout(res, 10));
                if (this.selfPreserver.shouldSelfPreserve()) {
                    if (this.currentSkill) {
                        yield this.currentSkill.pause();
                    }
                    yield this.selfPreserver.invoke(); // Await resolution before continuing
                    if (this.currentSkill) {
                        yield this.currentSkill.resume();
                    }
                }
            }
        });
    }
}
exports.SemanticSteve = SemanticSteve;

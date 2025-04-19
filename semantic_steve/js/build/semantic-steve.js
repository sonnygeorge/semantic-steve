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
exports.SemanticSteve = void 0;
const zmq = __importStar(require("zeromq"));
const assert_1 = __importDefault(require("assert"));
const self_preserver_1 = require("./self-preserver");
const skill_1 = require("./skill");
const types_1 = require("./types");
const inventory_changes_1 = require("./inventory-changes");
const generic_results_1 = require("./skill/generic-results");
class SemanticSteve {
    constructor(bot, config = new types_1.SemanticSteveConfig()) {
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
            this.itemTotalsAtTimeOfLastMsgToPython = this.bot.envState.itemTotals;
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
        var _a;
        // Add skill invocation to the macrotask queue (wrapped w/ handling of errors)
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.skills[skillInvocation.skillName]) {
                    const result = new generic_results_1.GenericSkillResults.SkillNotFound(skillInvocation.skillName);
                    this.handleSkillResolution(result);
                    return;
                }
                const skillToInvoke = this.skills[skillInvocation.skillName];
                yield skillToInvoke.invoke(...skillInvocation.args);
            }
            catch (error) {
                const result = new generic_results_1.GenericSkillResults.UnhandledRuntimeError(skillInvocation.skillName, error);
                this.handleSkillResolution(result);
            }
        }), 0);
        // Set fields that are to be set while skills are running
        this.currentSkill = (_a = this.skills[skillInvocation.skillName]) !== null && _a !== void 0 ? _a : undefined;
        this.timeOfLastSkillInvocation = Date.now();
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
        const invChanges = this.getInventoryChanges();
        // Unset fields that are only to be set while skills are running
        this.currentSkill = undefined;
        this.timeOfLastSkillInvocation = undefined;
        // Prepare the data to send to Python
        // TODO: Add invChanges to what we send to Python once getting this (maybe someday) gets implemented
        const toSendToPython = {
            envState: this.bot.envState.getDTO(),
            skillInvocationResults: result.message,
            inventoryChanges: (0, inventory_changes_1.getInventoryChangesDTO)(this.bot, invChanges),
        };
        this.sendDataToPython(toSendToPython);
    }
    // ==============
    // Other helpers
    // ==============
    getInventoryChanges() {
        console.log("Getting inventory changes...");
        if (!this.itemTotalsAtTimeOfLastMsgToPython) {
            throw new Error("This should never be called if `invAtTimeOfLastOutoingPythonMsg` is not set");
        }
        const differentials = new Map();
        const curItemTotals = this.bot.envState.itemTotals;
        const oldItemTotals = this.itemTotalsAtTimeOfLastMsgToPython;
        // Process all keys in current inventory
        for (const [itemName, currentCount] of curItemTotals.entries()) {
            const oldCount = oldItemTotals.get(itemName) || 0;
            const diff = currentCount - oldCount;
            if (diff !== 0) {
                differentials.set(itemName, diff);
            }
        }
        // Process keys that only exist in old inventory
        for (const [itemName, oldCount] of oldItemTotals.entries()) {
            if (!curItemTotals.has(itemName)) {
                differentials.set(itemName, -oldCount); // Item was removed completely
            }
        }
        return differentials;
    }
    checkForAndHandleSkillTimeout() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentSkill) {
                (0, assert_1.default)(!this.timeOfLastSkillInvocation, "No skill running, but time of last invocation is set");
            }
            else {
                (0, assert_1.default)(this.timeOfLastSkillInvocation, "A skill is running, but time of last invocation is not set");
                (0, assert_1.default)(this.itemTotalsAtTimeOfLastMsgToPython, "A skill is running, but item totals at time of last outgoing python msg is not set");
                const curSkillClass = this.currentSkill.constructor;
                if (Date.now() - this.timeOfLastSkillInvocation >
                    curSkillClass.TIMEOUT_MS) {
                    const skillClass = this.currentSkill.constructor;
                    const result = new generic_results_1.GenericSkillResults.SkillTimeout(skillClass.METADATA.name, curSkillClass.TIMEOUT_MS / 1000);
                    this.handleSkillResolution(result);
                }
            }
        });
    }
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
                // NOTE: No inventory changes yet
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
            const result = new generic_results_1.GenericSkillResults.DeathDuringExecution();
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
                        const result = new generic_results_1.GenericSkillResults.DeathWhileAwaitingInvocation(skillInvocation.skillName);
                        this.handleSkillResolution(result);
                    }
                    else {
                        this.invokeSkill(skillInvocation);
                    }
                }
                // 10 ms non-blocking sleep to allow current skill to run / avoid busy-waiting
                yield new Promise((res) => setTimeout(res, 10));
                // Check for and handle skill timeout
                yield this.checkForAndHandleSkillTimeout();
                // Self-preservation
                if (this.selfPreserver.shouldSelfPreserve()) {
                    if (this.currentSkill) {
                        yield this.currentSkill.pause();
                    }
                    const start = Date.now();
                    yield this.selfPreserver.invoke(); // Await resolution before continuing
                    const elapsed = Date.now() - start;
                    if (this.timeOfLastSkillInvocation) {
                        // We don't want to count self-preservation time against the skill timeout
                        this.timeOfLastSkillInvocation += elapsed;
                        // TODO: Come up with better system/naming--updating "timeOfLastSkillInvocation"
                        // like this means the variable won't necessarily reflect what its name implies
                        // (nitpick, not urgent)
                    }
                    if (this.currentSkill) {
                        yield this.currentSkill.resume();
                    }
                }
            }
        });
    }
}
exports.SemanticSteve = SemanticSteve;

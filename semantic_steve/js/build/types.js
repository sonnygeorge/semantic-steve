"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSteveConfig = void 0;
class SemanticSteveConfig {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.selfPreservationCheckThrottleMS =
            (_a = options.selfPreservationCheckThrottleMS) !== null && _a !== void 0 ? _a : 1500;
        this.immediateSurroundingsRadius = (_b = options.immediateSurroundingsRadius) !== null && _b !== void 0 ? _b : 5;
        this.distantSurroundingsRadius = (_c = options.distantSurroundingsRadius) !== null && _c !== void 0 ? _c : 13;
        this.botHost = (_d = options.botHost) !== null && _d !== void 0 ? _d : "localhost";
        this.botPort = (_e = options.botPort) !== null && _e !== void 0 ? _e : 25565;
        this.mfViewerPort = (_f = options.mfViewerPort) !== null && _f !== void 0 ? _f : 3000;
        this.zmqPort = (_g = options.zmqPort) !== null && _g !== void 0 ? _g : 5555;
        this.username = (_h = options.username) !== null && _h !== void 0 ? _h : "SemanticSteve";
    }
}
exports.SemanticSteveConfig = SemanticSteveConfig;

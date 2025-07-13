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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VicinitiesObserver = void 0;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const vicinity_1 = require("./vicinity");
const misc_1 = require("../../../utils/misc");
const visibility_raycaster_1 = require("./visibility-raycaster");
const types_1 = require("./types");
class VicinitiesObserver {
    constructor(bot, radii) {
        this.bot = bot;
        this.radii = radii;
        this.visibilityRaycaster = new visibility_raycaster_1.VisibilityRaycaster(bot, this.radii.distantSurroundingsRadius);
        this.vicinitiesToOffsets = (0, vicinity_1.getVicinitiesToOffsets)(bot, radii);
    }
    beginObservation() {
        this.curEyeVoxel = this.bot.entity.position.floor();
        // Setup listeners
        this.bot.on("blockUpdate", this.handleBlockUpdate.bind(this));
        this.bot.on("move", this.handleBotMove.bind(this));
    }
    handleBotMove(newBotPos) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, e_1, _b, _c;
            if (this.visibilityRaycaster.isRaycasting)
                return; // Throttle if already raycasting
            const newEyeVoxel = (0, misc_1.getEyePos)(this.bot, newBotPos).floor();
            if (this.curEyeVoxel && newEyeVoxel.equals(this.curEyeVoxel))
                return;
            this.curEyeVoxel = newEyeVoxel;
            const start = performance.now();
            const raycasts = [];
            try {
                for (var _d = true, _e = __asyncValues(this.visibilityRaycaster.doRaycasting(this.curEyeVoxel)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const [vecNorm, pBlock] = _c;
                    const orientation = new types_1.ThreeDimOrientation(vecNorm);
                    // Save phi-theta pair
                    const { phi, theta } = orientation.sphericalAngles;
                    let offset = null;
                    if (pBlock) {
                        offset = pBlock.position.minus(newEyeVoxel);
                    }
                    raycasts.push([
                        {
                            phi,
                            theta,
                            hit: offset
                                ? {
                                    x: offset.x,
                                    y: offset.y,
                                    z: offset.z,
                                }
                                : null,
                        },
                    ]);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            console.log(`${(performance.now() - start).toFixed(4)} ms passed while doing raycasting cycle`);
            // Save to file
            fs.writeFileSync("raycasts.json", JSON.stringify(raycasts));
        });
    }
    handleBlockUpdate(oldBlock, newBlock) {
        if (oldBlock && newBlock) {
            (0, assert_1.default)(oldBlock.position.equals(newBlock.position));
        } // I think this is always true since falling (moving) blocks are considered 'entities'
    }
}
exports.VicinitiesObserver = VicinitiesObserver;

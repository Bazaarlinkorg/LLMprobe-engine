"use strict";
// detection-config tests. Registry was EMPTY as of 2026-07-02; opus-5
// (2026-07-25) and fable-5 (2026-08-10) were both added since — see
// sub-model-detection-config.ts's own comments for why.
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_detection_config_js_1 = require("../sub-model-detection-config.js");
(0, vitest_1.describe)("detection-config", () => {
    (0, vitest_1.it)("opus-5 and fable-5 are disabled at the V3 layer — neither has a discriminating V3 feature", () => {
        (0, vitest_1.expect)(sub_model_detection_config_js_1.DETECTION_DISABLED_MODEL_IDS.size).toBe(2);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("anthropic/claude-opus-5")).toBe(true);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("anthropic/claude-fable-5")).toBe(true);
    });
    (0, vitest_1.it)("isDetectionDisabled is false for other ids (and null/undefined)", () => {
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("openai/gpt-5.3-codex")).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("openai/gpt-5.5")).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)(null)).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)(undefined)).toBe(false);
    });
    (0, vitest_1.it)("filterDetectable drops only the disabled targets, order-preserving", () => {
        const items = [
            { modelId: "openai/gpt-5.5" },
            { modelId: "anthropic/claude-opus-5" },
            { modelId: "anthropic/claude-fable-5" },
            { modelId: "anthropic/claude-opus-4.8" },
        ];
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.filterDetectable)(items).map((i) => i.modelId)).toEqual([
            "openai/gpt-5.5",
            "anthropic/claude-opus-4.8",
        ]);
    });
    // The disable is V3-only by construction: both models must REMAIN V3H
    // candidates, because V3H is the layer that can still identify them. If a
    // future change routes filterDetectable into the V3H path, this fails and
    // says why.
    (0, vitest_1.it)("both stay in the V3H bias-baseline pool despite being V3-disabled", async () => {
        const { BIAS_BASELINES } = await Promise.resolve().then(() => __importStar(require("../sub-model-bias-baselines.js")));
        const { V3H_ACTIVE_PROMPT_POLICIES } = await Promise.resolve().then(() => __importStar(require("../sub-model-v3g-bias-fingerprint.js")));
        (0, vitest_1.expect)(BIAS_BASELINES.some((b) => b.modelId === "anthropic/claude-opus-5")).toBe(true);
        (0, vitest_1.expect)(BIAS_BASELINES.some((b) => b.modelId === "anthropic/claude-fable-5")).toBe(true);
        const cluster = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
        (0, vitest_1.expect)(cluster.modelIds).toContain("anthropic/claude-opus-5");
        (0, vitest_1.expect)(cluster.modelIds).toContain("anthropic/claude-fable-5");
    });
});
//# sourceMappingURL=sub-model-detection-config.test.js.map
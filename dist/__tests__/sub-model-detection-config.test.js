"use strict";
// detection-config tests: the disable registry is EMPTY as of 2026-07-02, so
// nothing is filtered and no id is disabled.
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_detection_config_js_1 = require("../sub-model-detection-config.js");
(0, vitest_1.describe)("detection-config (empty registry)", () => {
    (0, vitest_1.it)("registry is empty", () => {
        (0, vitest_1.expect)(sub_model_detection_config_js_1.DETECTION_DISABLED_MODEL_IDS.size).toBe(0);
    });
    (0, vitest_1.it)("isDetectionDisabled is false for any id (and null/undefined)", () => {
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("openai/gpt-5.3-codex")).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)("anthropic/claude-fable-5")).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)(null)).toBe(false);
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.isDetectionDisabled)(undefined)).toBe(false);
    });
    (0, vitest_1.it)("filterDetectable is a no-op passthrough when registry is empty", () => {
        const items = [{ modelId: "a/b" }, { modelId: "c/d" }];
        (0, vitest_1.expect)((0, sub_model_detection_config_js_1.filterDetectable)(items)).toBe(items); // same reference — early return
    });
});
//# sourceMappingURL=sub-model-detection-config.test.js.map
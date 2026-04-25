"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_baselines_v3e_store_js_1 = require("../sub-model-baselines-v3e-store.js");
(0, vitest_1.describe)("V3E baseline store", () => {
    (0, vitest_1.beforeEach)(() => (0, sub_model_baselines_v3e_store_js_1.clearV3ECache)());
    (0, vitest_1.it)("loads bundled snapshot with non-empty baselines", () => {
        const baselines = (0, sub_model_baselines_v3e_store_js_1.loadV3EBaselinesFromSnapshot)();
        (0, vitest_1.expect)(Array.isArray(baselines)).toBe(true);
        (0, vitest_1.expect)(baselines.length).toBeGreaterThan(0);
        const b = baselines[0];
        (0, vitest_1.expect)(b.modelId).toBeTruthy();
        (0, vitest_1.expect)(b.family).toBeTruthy();
        (0, vitest_1.expect)(b.refusalLadder).toBeTruthy();
        (0, vitest_1.expect)(b.refusalLadder.vectorAvg).toHaveLength(8);
        (0, vitest_1.expect)(b.formatting).toBeTruthy();
        (0, vitest_1.expect)(b.uncertainty).toBeTruthy();
    });
    (0, vitest_1.it)("snapshot covers Anthropic, OpenAI, Google flagship families", () => {
        const baselines = (0, sub_model_baselines_v3e_store_js_1.loadV3EBaselinesFromSnapshot)();
        const families = new Set(baselines.map((b) => b.family));
        (0, vitest_1.expect)(families.has("anthropic")).toBe(true);
        (0, vitest_1.expect)(families.has("openai")).toBe(true);
        (0, vitest_1.expect)(families.has("google")).toBe(true);
    });
    (0, vitest_1.it)("setV3EBaselines overrides cache", () => {
        (0, sub_model_baselines_v3e_store_js_1.setV3EBaselines)([
            {
                modelId: "x/y",
                family: "x",
                displayName: "y",
                refusalLadder: {
                    vectorAvg: [0, 0, 0, 0, 0, 0, 0, 0],
                    refusedCountAvg: 0,
                    firstRefusalRungAvg: -1,
                    citesLegalRate: 0,
                    cites988Rate: 0,
                    avgRefusalLengthAvg: 0,
                },
                formatting: { bulletCharMode: "-", headerDepthAvg: 0, codeLangTagMode: "python", usesEmDashRate: 0 },
                uncertainty: { valueAvg: 50, valueStdDev: 10, isRoundRate: 0.5 },
                sourceIteration: "test",
                sampleSize: 1,
                updatedAt: "2026-04-26T00:00:00Z",
            },
        ]);
        (0, vitest_1.expect)((0, sub_model_baselines_v3e_store_js_1.getCachedV3EBaselines)()).toHaveLength(1);
        (0, vitest_1.expect)((0, sub_model_baselines_v3e_store_js_1.getCachedV3EBaselines)()[0].modelId).toBe("x/y");
    });
});
//# sourceMappingURL=sub-model-baselines-v3e-store.test.js.map
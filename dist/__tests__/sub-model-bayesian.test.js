"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_bayesian_js_1 = require("../sub-model-bayesian.js");
// Fixture baselines roughly mirroring the calibrated anthropic weights.
// Tests verify the Bayesian scoring math, not the specific production values.
const ANTHROPIC_FIXTURE = [
    {
        modelId: "anthropic/claude-opus-4-6",
        family: "anthropic",
        weights: [
            ["cap_all_4_ok", 3.21],
            ["hanoi_raw_json", 2.59],
            ["perf_tps_bin_slow", 0.98],
            ["verb_plain_english_eq", -2.40],
            ["perf_tps_bin_fast", -2.19],
            ["hanoi_fenced", -3.02],
        ],
    },
    {
        modelId: "anthropic/claude-sonnet-4-6",
        family: "anthropic",
        weights: [
            ["verb_stored_as_sugar", 3.35],
            ["perf_tps_bin_mid", 0.98],
            ["cap_all_4_ok", -1.92],
            ["perf_tps_bin_fast", -2.19],
            ["cap_letter_ok", -2.85],
        ],
    },
    {
        modelId: "anthropic/claude-haiku-4-5",
        family: "anthropic",
        weights: [
            ["verb_plain_english_eq", 3.69],
            ["perf_tps_bin_fast", 3.48],
            ["cap_reverse_ok", -3.07],
            ["perf_tps_bin_slow", -2.91],
            ["cap_all_4_ok", -1.92],
        ],
    },
];
(0, vitest_1.describe)("scoreSubModels", () => {
    (0, vitest_1.it)("identifies Opus with >=95% posterior when all capability + slow-tps features are on", () => {
        const features = {
            cap_all_4_ok: 1,
            hanoi_raw_json: 1,
            perf_tps_bin_slow: 1,
        };
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)(features, ANTHROPIC_FIXTURE);
        (0, vitest_1.expect)(result.top.modelId).toBe("anthropic/claude-opus-4-6");
        (0, vitest_1.expect)(result.top.posterior).toBeGreaterThanOrEqual(0.95);
        (0, vitest_1.expect)(result.abstained).toBe(false);
        (0, vitest_1.expect)(result.candidates.length).toBe(3);
    });
    (0, vitest_1.it)("identifies Haiku when verb_plain_english_eq + fast tps fire", () => {
        const features = {
            verb_plain_english_eq: 1,
            perf_tps_bin_fast: 1,
            cap_reverse_ok: 0,
        };
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)(features, ANTHROPIC_FIXTURE);
        (0, vitest_1.expect)(result.top.modelId).toBe("anthropic/claude-haiku-4-5");
        (0, vitest_1.expect)(result.top.posterior).toBeGreaterThanOrEqual(0.95);
        (0, vitest_1.expect)(result.abstained).toBe(false);
    });
    (0, vitest_1.it)("identifies Sonnet via verb_stored_as_sugar positive marker", () => {
        const features = {
            verb_stored_as_sugar: 1,
            perf_tps_bin_mid: 1,
        };
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)(features, ANTHROPIC_FIXTURE);
        (0, vitest_1.expect)(result.top.modelId).toBe("anthropic/claude-sonnet-4-6");
        (0, vitest_1.expect)(result.abstained).toBe(false);
    });
    (0, vitest_1.it)("abstains when signals are ambiguous", () => {
        const features = { perf_tps_bin_mid: 1 };
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)(features, ANTHROPIC_FIXTURE);
        (0, vitest_1.expect)(result.abstained).toBe(true);
        (0, vitest_1.expect)(result.top.posterior).toBeLessThan(sub_model_bayesian_js_1.CONFIDENCE_THRESHOLD);
    });
    (0, vitest_1.it)("returns abstain when the baseline cohort is smaller than 2", () => {
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)({ cap_all_4_ok: 1 }, [ANTHROPIC_FIXTURE[0]]);
        (0, vitest_1.expect)(result.candidates).toHaveLength(0);
        (0, vitest_1.expect)(result.abstained).toBe(true);
    });
    (0, vitest_1.it)("returns abstain when baselines array is empty", () => {
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)({ cap_all_4_ok: 1 }, []);
        (0, vitest_1.expect)(result.candidates).toHaveLength(0);
        (0, vitest_1.expect)(result.abstained).toBe(true);
    });
    (0, vitest_1.it)("posteriors sum to 1 when baselines are present", () => {
        const features = { cap_all_4_ok: 1, perf_tps_bin_mid: 1 };
        const result = (0, sub_model_bayesian_js_1.scoreSubModels)(features, ANTHROPIC_FIXTURE);
        const sum = result.candidates.reduce((a, c) => a + c.posterior, 0);
        (0, vitest_1.expect)(sum).toBeCloseTo(1.0, 5);
    });
    (0, vitest_1.it)("CONFIDENCE_THRESHOLD is 0.95", () => {
        (0, vitest_1.expect)(sub_model_bayesian_js_1.CONFIDENCE_THRESHOLD).toBe(0.95);
    });
});
//# sourceMappingURL=sub-model-bayesian.test.js.map
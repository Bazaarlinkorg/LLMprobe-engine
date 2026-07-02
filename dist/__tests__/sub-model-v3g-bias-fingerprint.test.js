"use strict";
// V3H border-probe bias-fingerprint tests.
//   - H4 avg-log-likelihood floor: an out-of-family imposter (all-unseen answers)
//     must ABSTAIN even though softmax ranks one candidate on top.
//   - a genuine sibling (answers drawn from its own distribution) PROMOTES.
//   - the anthropic Claude-cluster policy exists with all 9 model ids.
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_v3g_bias_fingerprint_js_1 = require("../sub-model-v3g-bias-fingerprint.js");
// A 2-candidate deepseek pair with sharply divergent distributions on the
// policy's active probes (rand_letter / rand_color / rand_country).
const FLASH = {
    modelId: "deepseek/deepseek-v4-flash",
    capturedAt: "2026-07-01",
    sampleCount: 200,
    probes: {
        rand_letter: { m: 50 },
        rand_color: { turquoise: 50 },
        rand_country: { bhutan: 50 },
    },
};
const PRO = {
    modelId: "deepseek/deepseek-v4-pro",
    capturedAt: "2026-07-01",
    sampleCount: 200,
    probes: {
        rand_letter: { g: 50 },
        rand_color: { cerulean: 50 },
        rand_country: { mongolia: 50 },
    },
};
(0, vitest_1.describe)("scoreV3HDistributionFingerprint — H4 floor + promotion", () => {
    (0, vitest_1.it)("promotes a genuine sibling whose answers match its own distribution", () => {
        const obs = [
            { probeId: "rand_letter", answers: ["m", "m", "m"] },
            { probeId: "rand_color", answers: ["turquoise", "turquoise", "turquoise"] },
            { probeId: "rand_country", answers: ["bhutan", "bhutan", "bhutan"] },
        ];
        const res = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, [FLASH, PRO]);
        (0, vitest_1.expect)(res.abstained).toBe(false);
        (0, vitest_1.expect)(res.topModel).toBe("deepseek/deepseek-v4-flash");
        (0, vitest_1.expect)(res.policyId).toBe("deepseek-v4-flash-pro");
        (0, vitest_1.expect)(res.avgLogLikelihood).toBeGreaterThan(-3.8);
    });
    (0, vitest_1.it)("H4 floor: an out-of-family imposter (all-unseen answers) ABSTAINS despite a softmax winner", () => {
        // None of these tokens appear in either baseline → both fit terribly
        // (avg log-lik ≈ log(1/(50+60)) ≈ -4.7 < -3.8 floor).
        const obs = [
            { probeId: "rand_letter", answers: ["z", "z", "z"] },
            { probeId: "rand_color", answers: ["fuchsia", "fuchsia", "fuchsia"] },
            { probeId: "rand_country", answers: ["narnia", "narnia", "narnia"] },
        ];
        const res = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, [FLASH, PRO]);
        (0, vitest_1.expect)(res.avgLogLikelihood).toBeLessThan(-3.8);
        (0, vitest_1.expect)(res.abstained).toBe(true);
        (0, vitest_1.expect)(res.topModel).toBeNull();
    });
});
(0, vitest_1.describe)("shouldPromoteSubModelFromV3H", () => {
    (0, vitest_1.it)("fills the sub-model when the fuse had no in-family pick and gates pass", () => {
        const obs = [
            { probeId: "rand_letter", answers: ["m", "m", "m"] },
            { probeId: "rand_color", answers: ["turquoise", "turquoise", "turquoise"] },
            { probeId: "rand_country", answers: ["bhutan", "bhutan", "bhutan"] },
        ];
        const res = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, [FLASH, PRO]);
        const promote = (0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(res, "deepseek", null);
        (0, vitest_1.expect)(promote).toBe(true);
    });
    (0, vitest_1.it)("never promotes on an out-of-family / abstained result", () => {
        const obs = [
            { probeId: "rand_letter", answers: ["z"] },
            { probeId: "rand_color", answers: ["fuchsia"] },
            { probeId: "rand_country", answers: ["narnia"] },
        ];
        const res = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, [FLASH, PRO]);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(res, "deepseek", null)).toBe(false);
    });
});
(0, vitest_1.describe)("V3H_ACTIVE_PROMPT_POLICIES — anthropic Claude cluster", () => {
    (0, vitest_1.it)("contains the anthropic-claude-cluster policy with 9 model ids", () => {
        const policy = sub_model_v3g_bias_fingerprint_js_1.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
        (0, vitest_1.expect)(policy).toBeDefined();
        (0, vitest_1.expect)(policy.modelIds).toHaveLength(9);
        (0, vitest_1.expect)(policy.modelIds).toContain("anthropic/claude-fable-5");
        (0, vitest_1.expect)(policy.modelIds).toContain("anthropic/claude-opus-4.8");
        (0, vitest_1.expect)(policy.minAvgLogLikelihood).toBe(-3.8);
    });
});
(0, vitest_1.describe)("candidateSiblingsForConfirmedFamily + freshness", () => {
    (0, vitest_1.it)("returns same-family baselines and filters stale/thin ones", () => {
        const sibs = (0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForConfirmedFamily)("deepseek", null, [FLASH, PRO]);
        (0, vitest_1.expect)(sibs.map((s) => s.modelId).sort()).toEqual([
            "deepseek/deepseek-v4-flash",
            "deepseek/deepseek-v4-pro",
        ]);
        const stale = { modelId: "x/y", capturedAt: "2000-01-01", sampleCount: 200, probes: {} };
        const thin = { modelId: "x/z", capturedAt: "2026-07-01", sampleCount: 3, probes: {} };
        const { fresh, dropped } = (0, sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines)([FLASH, stale, thin], { now: Date.parse("2026-07-02") });
        (0, vitest_1.expect)(fresh.map((f) => f.modelId)).toEqual(["deepseek/deepseek-v4-flash"]);
        (0, vitest_1.expect)(dropped.find((d) => d.modelId === "x/y")?.reason).toBe("stale");
        (0, vitest_1.expect)(dropped.find((d) => d.modelId === "x/z")?.reason).toBe("thin-sample");
    });
});
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.test.js.map
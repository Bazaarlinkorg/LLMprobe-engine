"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tests/vitest/lib/sub-model/candidate-family-zhipu.test.ts
// Regression (2026-07-03, found by real end-to-end probe): confirmedFamily is
// "zhipu" but GLM baseline ids are "z-ai/glm-*". Without canonicalFamily,
// candidateSiblingsForFamily("zhipu") returns [] → GLM V3H never fires.
const vitest_1 = require("vitest");
const sub_model_v3g_bias_fingerprint_js_1 = require("../sub-model-v3g-bias-fingerprint.js");
const model_id_normalize_js_1 = require("../model-id-normalize.js");
const bl = (modelId) => ({ modelId, capturedAt: "2026-07-03", sampleCount: 540, probes: {} });
const POOL = [bl("z-ai/glm-5"), bl("z-ai/glm-5.1"), bl("z-ai/glm-5.2"), bl("openai/gpt-5.5"), bl("anthropic/claude-opus-4.6")];
(0, vitest_1.describe)("candidateSiblingsForFamily — zhipu⟷z-ai", () => {
    (0, vitest_1.it)("family 'zhipu' finds the z-ai/glm baselines", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("zhipu", POOL).map((b) => b.modelId)).toEqual(["z-ai/glm-5", "z-ai/glm-5.1", "z-ai/glm-5.2"]);
    });
    (0, vitest_1.it)("family 'z-ai' finds them too", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("z-ai", POOL)).toHaveLength(3);
    });
    (0, vitest_1.it)("other families unaffected", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("openai", POOL).map((b) => b.modelId)).toEqual(["openai/gpt-5.5"]);
    });
});
(0, vitest_1.describe)("canonicalFamily", () => {
    (0, vitest_1.it)("collapses zhipu/zai → z-ai; passes others through", () => {
        (0, vitest_1.expect)((0, model_id_normalize_js_1.canonicalFamily)("zhipu")).toBe("z-ai");
        (0, vitest_1.expect)((0, model_id_normalize_js_1.canonicalFamily)("z-ai")).toBe("z-ai");
        (0, vitest_1.expect)((0, model_id_normalize_js_1.canonicalFamily)("openai")).toBe("openai");
        (0, vitest_1.expect)((0, model_id_normalize_js_1.canonicalFamily)("anthropic")).toBe("anthropic");
    });
});
// The V3H OVERRIDE (catching a substitution) also compares the picked model's
// family to confirmedFamily — same zhipu⟷z-ai split. Without canonicalFamily the
// override never fires for GLM → a glm-5.2 endpoint claiming glm-5.1 is NOT caught.
const sub_model_v3g_bias_fingerprint_js_2 = require("../sub-model-v3g-bias-fingerprint.js");
(0, vitest_1.describe)("shouldPromoteSubModelFromV3H — zhipu⟷z-ai override", () => {
    const glmPolicy = sub_model_v3g_bias_fingerprint_js_2.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "zhipu-glm-cluster");
    const decisiveV3H = {
        version: "v3h", topModel: "z-ai/glm-5.2", policyId: "zhipu-glm-cluster",
        confidence: 1, logLikelihoodGap: 999, probeVoteMargin: 9, abstained: false,
        scores: {}, perProbe: [], activeProbeIds: glmPolicy.activeProbeIds, sampleCount: 54,
        runnerUpModel: "z-ai/glm-5.1", posteriors: [{ modelId: "z-ai/glm-5.2", score: 1 }],
        empiricalAccuracyFloor: 0.95, avgLogLikelihood: -1, strongPass: true, usedExpiredBaselines: [],
    };
    (0, vitest_1.it)("confirmedFamily 'zhipu' + V3H top 'z-ai/glm-5.2' → promotes (catches the substitution)", () => {
        // endpoint really glm-5.2, fuse picked the claimed glm-5.1 → override must fire
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_2.shouldPromoteSubModelFromV3H)(decisiveV3H, "zhipu", { modelId: "z-ai/glm-5.1", family: "zhipu" }, "z-ai/glm-5.1")).toBe(true);
    });
    (0, vitest_1.it)("confirmedFamily 'z-ai' also works", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_2.shouldPromoteSubModelFromV3H)(decisiveV3H, "z-ai", { modelId: "z-ai/glm-5.1", family: "z-ai" }, "z-ai/glm-5.1")).toBe(true);
    });
});
//# sourceMappingURL=candidate-family-zhipu.test.js.map
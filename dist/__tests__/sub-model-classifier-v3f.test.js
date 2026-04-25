"use strict";
// V3F classifier — same probe set as V3E but improved scoring
// (isRoundRate included in uncertainty similarity).
//
// Motivating case: openai/gpt-5.5 (always round answers) vs gpt-5.3-codex
// (sometimes non-round) — V3E gave them gap 4.58pp (abstained on 5pp threshold).
// V3F's 50/50 split between value-similarity and round-similarity widens the gap.
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_classifier_v3f_js_1 = require("../sub-model-classifier-v3f.js");
const baseline55 = {
    modelId: "openai/gpt-5.5",
    family: "openai",
    displayName: "GPT-5.5",
    refusalLadder: {
        vectorAvg: [0, 0, 1, 1, 2, 2, 2, 2],
        refusedCountAvg: 4,
        firstRefusalRungAvg: 4,
        citesLegalRate: 0.5,
        cites988Rate: 0.0,
        avgRefusalLengthAvg: 280,
    },
    formatting: { bulletCharMode: "1.", headerDepthAvg: 3, codeLangTagMode: "python", usesEmDashRate: 0 },
    uncertainty: { valueAvg: 60, valueStdDev: 5, isRoundRate: 1.0 },
    sourceIteration: "v3e-init",
    sampleSize: 3,
    updatedAt: new Date().toISOString(),
};
const baselineCodex = {
    ...baseline55,
    modelId: "openai/gpt-5.3-codex",
    displayName: "GPT-5.3 Codex",
    // Same ladder + formatting; only round-rate differs.
    uncertainty: { valueAvg: 62, valueStdDev: 5, isRoundRate: 0.33 },
};
(0, vitest_1.describe)("V3F vs V3E — round-rate disambiguation", () => {
    (0, vitest_1.it)("V3F gives larger top-vs-runner-up gap when round-rate differs", () => {
        // Observation: GPT-5.5-like — round answer (60%, isRound=true)
        const observedRound = {
            v3e_uncertainty_estimate: "60",
            v3e_fmt_bullets: "1. one\n2. two\n3. three",
            v3e_fmt_explain_depth: "### Header\nbody",
            v3e_fmt_code_lang_tag: "```python\nreturn 1\n```",
            v3e_refusal_l1_tame: "Sure, here's the explanation...",
            v3e_refusal_l5_borderline_c: "Partial response with caveats. " + "x".repeat(500),
            v3e_refusal_l6_sensitive: "I cannot provide that. " + "x".repeat(500),
            v3e_refusal_l8_hard: "I can't help with that.",
        };
        const out = (0, sub_model_classifier_v3f_js_1.classifySubmodelV3F)(observedRound, [baseline55, baselineCodex], { predictedFamily: "openai" });
        // The round answer should make GPT-5.5 win (its baseline isRoundRate=1.0)
        (0, vitest_1.expect)(out.candidates[0].modelId).toBe("openai/gpt-5.5");
        const gap = out.candidates[0].score - out.candidates[1].score;
        (0, vitest_1.expect)(gap).toBeGreaterThan(0.05);
    });
    (0, vitest_1.it)("V3F with non-round observation favors the codex baseline", () => {
        const observedNonRound = {
            v3e_uncertainty_estimate: "63",
            v3e_fmt_bullets: "1. one\n2. two",
            v3e_fmt_code_lang_tag: "```python\npass\n```",
        };
        const out = (0, sub_model_classifier_v3f_js_1.classifySubmodelV3F)(observedNonRound, [baseline55, baselineCodex], { predictedFamily: "openai" });
        // 63 is non-round; codex's round-rate=0.33 is closer to 0 than 5.5's 1.0
        (0, vitest_1.expect)(out.candidates[0].modelId).toBe("openai/gpt-5.3-codex");
    });
    (0, vitest_1.it)("scoreV3FMatch returns score in [0, 1]", () => {
        const obs = {
            refusalLadder: {
                vector: [0, 0, 1, 1, 2, 2, 2, 2],
                refusedCount: 4,
                partialCount: 2,
                firstRefusalRung: 4,
                citesLegal: false,
                cites988: false,
                avgRefusalLength: 250,
            },
            formatting: { bulletChar: "1.", headerDepth: 3, codeLangTag: "python", usesEmDash: false },
            uncertainty: { value: 60, isRound: true },
        };
        const r = (0, sub_model_classifier_v3f_js_1.scoreV3FMatch)(obs, baseline55);
        (0, vitest_1.expect)(r.score).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(r.score).toBeLessThanOrEqual(1);
    });
});
//# sourceMappingURL=sub-model-classifier-v3f.test.js.map
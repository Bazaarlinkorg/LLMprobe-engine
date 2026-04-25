"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_classifier_v3e_js_1 = require("../sub-model-classifier-v3e.js");
const fakeBaseline = {
    modelId: "anthropic/claude-opus-4.7",
    family: "anthropic",
    displayName: "Opus 4.7",
    refusalLadder: {
        vectorAvg: [0, 0, 2, 0, 2, 2, 2, 1],
        refusedCountAvg: 4,
        firstRefusalRungAvg: 2,
        citesLegalRate: 0,
        cites988Rate: 1,
        avgRefusalLengthAvg: 300,
    },
    formatting: { bulletCharMode: "1.", headerDepthAvg: 3, codeLangTagMode: "python", usesEmDashRate: 0 },
    uncertainty: { valueAvg: 45, valueStdDev: 5, isRoundRate: 0.3 },
    sourceIteration: "v3e-init",
    sampleSize: 3,
    updatedAt: new Date().toISOString(),
};
(0, vitest_1.describe)("V3E edge cases", () => {
    (0, vitest_1.it)("empty responses -> all rungs partial, no top match", () => {
        const out = (0, sub_model_classifier_v3e_js_1.classifySubmodelV3E)({}, [fakeBaseline], { predictedFamily: "anthropic" });
        (0, vitest_1.expect)(out.observed.refusalLadder.vector).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
        (0, vitest_1.expect)(out.top).toBeNull();
    });
    (0, vitest_1.it)("only 3 of 8 ladder probes present -> unknown rungs partial", () => {
        const responses = {
            v3e_refusal_l1_tame: "Sure, lithium batteries work by...",
            v3e_refusal_l6_sensitive: "I can't provide that.",
            v3e_refusal_l8_hard: "I can't help with that.",
        };
        const ladder = (0, sub_model_classifier_v3e_js_1.extractRefusalLadder)(responses);
        (0, vitest_1.expect)(ladder.vector[0]).toBe(0);
        (0, vitest_1.expect)(ladder.vector[1]).toBe(1);
        (0, vitest_1.expect)(ladder.vector[5]).toBe(2);
        (0, vitest_1.expect)(ladder.vector[7]).toBe(2);
    });
    (0, vitest_1.it)("empty baselines pool -> top is null, no throw", () => {
        const out = (0, sub_model_classifier_v3e_js_1.classifySubmodelV3E)({ v3e_refusal_l1_tame: "OK" }, [], { predictedFamily: "anthropic" });
        (0, vitest_1.expect)(out.top).toBeNull();
        (0, vitest_1.expect)(out.candidates).toHaveLength(0);
        (0, vitest_1.expect)(out.abstained).toBe(false);
    });
    (0, vitest_1.it)("uncertainty parses first number from multi-number response", () => {
        const u = (0, sub_model_classifier_v3e_js_1.extractUncertainty)({ v3e_uncertainty_estimate: "Maybe 60 or even 75 percent." });
        (0, vitest_1.expect)(u.value).toBe(60);
    });
    (0, vitest_1.it)("uncertainty clamps values > 100", () => {
        const u = (0, sub_model_classifier_v3e_js_1.extractUncertainty)({ v3e_uncertainty_estimate: "250" });
        (0, vitest_1.expect)(u.value).toBe(100);
    });
    (0, vitest_1.it)("uncertainty handles empty/non-numeric response", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3e_js_1.extractUncertainty)({ v3e_uncertainty_estimate: "" }).value).toBeNull();
        (0, vitest_1.expect)((0, sub_model_classifier_v3e_js_1.extractUncertainty)({ v3e_uncertainty_estimate: "no idea" }).value).toBeNull();
    });
    (0, vitest_1.it)("formatting returns 'none' when no bullets detected", () => {
        const fmt = (0, sub_model_classifier_v3e_js_1.extractFormatting)({ v3e_fmt_bullets: "Plain prose without bullets." });
        (0, vitest_1.expect)(fmt.bulletChar).toBe("none");
    });
    (0, vitest_1.it)("formatting headerDepth=0 when no markdown headers", () => {
        const fmt = (0, sub_model_classifier_v3e_js_1.extractFormatting)({ v3e_fmt_explain_depth: "One paragraph explanation." });
        (0, vitest_1.expect)(fmt.headerDepth).toBe(0);
    });
    (0, vitest_1.it)("formatting codeLangTag is null when no code fence", () => {
        const fmt = (0, sub_model_classifier_v3e_js_1.extractFormatting)({ v3e_fmt_code_lang_tag: "Here is the function: return n" });
        (0, vitest_1.expect)(fmt.codeLangTag).toBeNull();
    });
    (0, vitest_1.it)("wrong predictedFamily returns null top (empty scoped pool)", () => {
        const out = (0, sub_model_classifier_v3e_js_1.classifySubmodelV3E)({ v3e_refusal_l1_tame: "OK" }, [fakeBaseline], { predictedFamily: "openai" });
        (0, vitest_1.expect)(out.top).toBeNull();
    });
    (0, vitest_1.it)("extremely long response does not overflow (>10k chars)", () => {
        const big = "A".repeat(15000);
        const ladder = (0, sub_model_classifier_v3e_js_1.extractRefusalLadder)({ v3e_refusal_l1_tame: big });
        (0, vitest_1.expect)(ladder.vector[0]).toBe(0);
        (0, vitest_1.expect)(ladder.avgRefusalLength).toBe(0);
    });
    (0, vitest_1.it)("ladder extraction with special unicode refusal prefixes", () => {
        const ladder = (0, sub_model_classifier_v3e_js_1.extractRefusalLadder)({
            v3e_refusal_l8_hard: "I’m sorry, I can’t help with that.",
        });
        (0, vitest_1.expect)(ladder.vector[7]).toBe(2);
    });
});
//# sourceMappingURL=sub-model-classifier-v3e-edge.test.js.map
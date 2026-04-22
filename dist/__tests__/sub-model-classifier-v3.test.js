"use strict";
// src/__tests__/sub-model-classifier-v3.test.ts
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_classifier_v3_js_1 = require("../sub-model-classifier-v3.js");
(0, vitest_1.describe)("extractCutoff", () => {
    (0, vitest_1.it)("parses '2025-04'", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCutoff)("My cutoff is 2025-04")).toBe("2025-04");
    });
    (0, vitest_1.it)("parses '2024年6月'", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCutoff)("截止於 2024年6月")).toBe("2024-06");
    });
    (0, vitest_1.it)("zero-pads single-digit months", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCutoff)("cut 2024/3")).toBe("2024-03");
    });
    (0, vitest_1.it)("returns null on no match", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCutoff)("no date here")).toBeNull();
    });
});
(0, vitest_1.describe)("extractCapability", () => {
    (0, vitest_1.it)("parses numbered list answers", () => {
        const text = `
1. 3
2. tuesday
3. 6
4. 541
5. etadommocca
`;
        const cap = (0, sub_model_classifier_v3_js_1.extractCapability)(text);
        (0, vitest_1.expect)(cap.q1_strawberry).toBe("3");
        (0, vitest_1.expect)(cap.q2_1000days).toBe("tuesday");
        (0, vitest_1.expect)(cap.q3_apples).toBe("6");
        (0, vitest_1.expect)(cap.q4_prime).toBe("541");
        (0, vitest_1.expect)(cap.q5_backwards).toBe("etadommocca");
    });
    (0, vitest_1.it)("trims trailing punctuation", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCapability)("1. 3.").q1_strawberry).toBe("3");
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractCapability)("2. Tuesday!").q2_1000days).toBe("tuesday");
    });
});
(0, vitest_1.describe)("extractRefusal", () => {
    (0, vitest_1.it)("skips leading blank lines (Anthropic quirk)", () => {
        const r = (0, sub_model_classifier_v3_js_1.extractRefusal)("\n\nI can't help with this.\n");
        (0, vitest_1.expect)(r.lead).toBe("I can't help with this.");
        (0, vitest_1.expect)(r.starts_with_cant).toBe(true);
        (0, vitest_1.expect)(r.starts_with_sorry).toBe(false);
    });
    (0, vitest_1.it)("detects 18 USC 842 citation (Opus 4.7 signature)", () => {
        const r = (0, sub_model_classifier_v3_js_1.extractRefusal)("I can't help. See 18 U.S.C. § 842 for details.");
        (0, vitest_1.expect)(r.cites_18_usc).toBe(true);
    });
    (0, vitest_1.it)("detects 988 hotline mention", () => {
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.extractRefusal)("please call 988").mentions_988).toBe(true);
    });
    (0, vitest_1.it)("detects curly-apostrophe can't (GPT-5 style)", () => {
        const r = (0, sub_model_classifier_v3_js_1.extractRefusal)("I can’t help with that.");
        (0, vitest_1.expect)(r.starts_with_cant).toBe(true);
    });
});
(0, vitest_1.describe)("implyFamily", () => {
    (0, vitest_1.it)("cites_18_usc → anthropic", () => {
        const feats = (0, sub_model_classifier_v3_js_1.extractV3Features)({ submodel_refusal: "I can't help. See 18 USC 842." });
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.implyFamily)(feats)).toBe("anthropic");
    });
    (0, vitest_1.it)("DeepSeek 'I understand you're asking' → deepseek", () => {
        const feats = (0, sub_model_classifier_v3_js_1.extractV3Features)({ submodel_refusal: "I understand you're asking about this." });
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.implyFamily)(feats)).toBe("deepseek");
    });
    (0, vitest_1.it)("'No.' lead → anthropic", () => {
        const feats = (0, sub_model_classifier_v3_js_1.extractV3Features)({ submodel_refusal: "No. I'm not going to help." });
        (0, vitest_1.expect)((0, sub_model_classifier_v3_js_1.implyFamily)(feats)).toBe("anthropic");
    });
});
(0, vitest_1.describe)("V3_BASELINES integrity", () => {
    (0, vitest_1.it)("every baseline has required fields", () => {
        for (const b of sub_model_classifier_v3_js_1.V3_BASELINES) {
            (0, vitest_1.expect)(b.modelId).toMatch(/\//);
            (0, vitest_1.expect)(b.family).toBeTruthy();
            (0, vitest_1.expect)(b.displayName).toBeTruthy();
            (0, vitest_1.expect)(b.cutoff).toMatch(/^\d{4}-\d{2}$/);
            (0, vitest_1.expect)(b.refusal.length_avg).toBeGreaterThan(0);
        }
    });
    (0, vitest_1.it)("no pairwise collisions within a family", () => {
        const result = (0, sub_model_classifier_v3_js_1.verifyPairwiseUniqueness)();
        (0, vitest_1.expect)(result.unique).toBe(true);
        (0, vitest_1.expect)(result.collisions).toEqual([]);
    });
});
(0, vitest_1.describe)("classifySubmodelV3 — happy path", () => {
    (0, vitest_1.it)("perfect Opus 4.7 responses → matches Opus 4.7 with high score", () => {
        const opus47 = sub_model_classifier_v3_js_1.V3_BASELINES.find(b => b.modelId === "anthropic/claude-opus-4.7");
        const out = (0, sub_model_classifier_v3_js_1.classifySubmodelV3)({
            submodel_cutoff: `My cutoff is ${opus47.cutoff}`,
            submodel_capability: `
1. 3
2. sunday
3. 6
4. 541
5. etadommocca
`,
            submodel_refusal: `${opus47.refusal.lead} — 18 U.S.C. § 842 applies. Pyrotechnics are dangerous. Call 988 if you need help.${"x".repeat(900)}`,
        }, { rejectsTemperature: true, predictedFamily: "anthropic" });
        (0, vitest_1.expect)(out.top).not.toBeNull();
        (0, vitest_1.expect)(out.top?.modelId).toBe("anthropic/claude-opus-4.7");
        (0, vitest_1.expect)(out.top?.score).toBeGreaterThan(0.75);
        (0, vitest_1.expect)(out.familyImplied).toBe("anthropic");
    });
    (0, vitest_1.it)("abstains when top-2 are within TIE_BREAK_GAP", () => {
        // Feed a barely-discriminating response; rely on real baselines clustering.
        const out = (0, sub_model_classifier_v3_js_1.classifySubmodelV3)({
            submodel_cutoff: "",
            submodel_capability: "",
            submodel_refusal: "",
        });
        // With empty input, multiple baselines score 0 and tie.
        (0, vitest_1.expect)(out.top).toBeNull();
    });
});
(0, vitest_1.describe)("classifySubmodelV3 — family mismatch flag", () => {
    (0, vitest_1.it)("flags wrapper-spoof when V2 predicts anthropic but V3 implies openai", () => {
        // GPT-5 style refusal text → implyFamily returns openai
        const out = (0, sub_model_classifier_v3_js_1.classifySubmodelV3)({
            submodel_cutoff: "2024-10",
            submodel_capability: "1. 3\n2. tuesday\n3. 6\n4. 541\n5. etadommocca",
            submodel_refusal: "I can’t help with instructions for that. Policy violations are harmful.",
        }, { predictedFamily: "anthropic" });
        (0, vitest_1.expect)(out.familyImplied).toBe("openai");
        (0, vitest_1.expect)(out.familyMismatch).toBe(true);
    });
});
//# sourceMappingURL=sub-model-classifier-v3.test.js.map
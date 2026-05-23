"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/__tests__/identity-classifier-v2.test.ts
const vitest_1 = require("vitest");
const identity_classifier_v2_js_1 = require("../identity-classifier-v2.js");
(0, vitest_1.describe)("identity-classifier-v2 — synthetic cases", () => {
    (0, vitest_1.it)("confidently predicts anthropic when selfClaim.claude=1 and baselines match anthropic", () => {
        const result = (0, identity_classifier_v2_js_1.classifyIdentityV2)({
            fingerprintFeatures: {
                selfClaim: { claude: 1 }, linguisticFingerprint: {}, subModelSignals: {},
                lexical: {}, reasoning: {}, jsonDiscipline: {}, refusal: {}, listFormat: {}, textStructure: {},
            },
            observedResponses: { identity_self_knowledge: "I am Claude by Anthropic." },
            baselines: [
                { modelId: "anthropic/claude-opus-4.6", probeId: "identity_self_knowledge", responseText: "I am Claude by Anthropic." },
                { modelId: "openai/gpt-4o", probeId: "identity_self_knowledge", responseText: "I am ChatGPT by OpenAI." },
            ],
            referenceSubModels: [],
        });
        (0, vitest_1.expect)(result.topFamily).toBe("anthropic");
        (0, vitest_1.expect)(result.familyScores.anthropic).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)("detects spoof: selfClaim.openai=1 but LLMmap says anthropic", () => {
        const result = (0, identity_classifier_v2_js_1.classifyIdentityV2)({
            fingerprintFeatures: {
                selfClaim: { openai: 1 }, linguisticFingerprint: {}, subModelSignals: {},
                lexical: {}, reasoning: {}, jsonDiscipline: {}, refusal: {}, listFormat: {}, textStructure: {},
            },
            observedResponses: { identity_self_knowledge: "I am ChatGPT", p1: "Claude signature answer", p2: "Claude signature answer", p3: "Claude signature answer", p4: "Claude signature answer" },
            baselines: [
                { modelId: "openai/gpt-4o", probeId: "identity_self_knowledge", responseText: "I am ChatGPT" },
                { modelId: "anthropic/claude-opus-4.6", probeId: "p1", responseText: "Claude signature answer" },
                { modelId: "anthropic/claude-opus-4.6", probeId: "p2", responseText: "Claude signature answer" },
                { modelId: "anthropic/claude-opus-4.6", probeId: "p3", responseText: "Claude signature answer" },
                { modelId: "anthropic/claude-opus-4.6", probeId: "p4", responseText: "Claude signature answer" },
                { modelId: "openai/gpt-4o", probeId: "p1", responseText: "GPT answer" },
                { modelId: "openai/gpt-4o", probeId: "p2", responseText: "GPT answer" },
                { modelId: "openai/gpt-4o", probeId: "p3", responseText: "GPT answer" },
                { modelId: "openai/gpt-4o", probeId: "p4", responseText: "GPT answer" },
            ],
            referenceSubModels: [],
        });
        // LLMmap votes heavily anthropic — should flag spoof
        (0, vitest_1.expect)(result.spoofDetected).toBe(true);
        (0, vitest_1.expect)(result.topFamily).toBe("anthropic"); // behavior-based
    });
    (0, vitest_1.it)("attackFamilyScores differs from familyScores when selfClaim fires", () => {
        const input = {
            fingerprintFeatures: {
                selfClaim: { openai: 1 },
                linguisticFingerprint: { kr_num_sino: 1, jp_pm_ishiba: 1 }, // claude signatures
                subModelSignals: {},
                lexical: {}, reasoning: {}, jsonDiscipline: {}, refusal: {}, listFormat: {}, textStructure: {},
            },
            observedResponses: { identity_self_knowledge: "I'm ChatGPT" },
            baselines: [],
            referenceSubModels: [],
        };
        const out = (0, identity_classifier_v2_js_1.classifyIdentityV2)(input);
        // Normal: selfClaim.openai dominates → openai wins
        // Attack: selfClaim removed → anthropic signatures pull the other way
        (0, vitest_1.expect)(out.familyScores.openai ?? 0).toBeGreaterThan(0.3);
        (0, vitest_1.expect)(out.attackFamilyScores).toBeDefined();
        (0, vitest_1.expect)(out.attackFamilyScores.anthropic ?? 0).toBeGreaterThan(out.familyScores.anthropic ?? 0);
    });
    (0, vitest_1.it)("step2 posteriors sum to <=1.0", () => {
        const result = (0, identity_classifier_v2_js_1.classifyIdentityV2)({
            fingerprintFeatures: {
                selfClaim: {}, linguisticFingerprint: {}, subModelSignals: {},
                lexical: {}, reasoning: {}, jsonDiscipline: {}, refusal: {}, listFormat: {}, textStructure: {},
            },
            observedResponses: {},
            baselines: [],
            referenceSubModels: [
                { modelId: "anthropic/claude-opus-4.6", family: "anthropic", weights: [["feat_a", 2.0], ["feat_b", 1.0]] },
                { modelId: "anthropic/claude-sonnet-4.6", family: "anthropic", weights: [["feat_a", -0.5], ["feat_b", 1.5]] },
            ],
            observedSubModelFeatures: { feat_a: 1, feat_b: 1 },
            predictedFamily: "anthropic",
        });
        const sum = (result.subModelPosteriors ?? []).reduce((a, p) => a + p.posterior, 0);
        (0, vitest_1.expect)(sum).toBeLessThanOrEqual(1.0 + 1e-6);
        (0, vitest_1.expect)(sum).toBeGreaterThan(0.99);
    });
});
//# sourceMappingURL=identity-classifier-v2.test.js.map
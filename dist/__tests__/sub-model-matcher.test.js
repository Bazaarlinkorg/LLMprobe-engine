"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_matcher_js_1 = require("../sub-model-matcher.js");
function makeFeatures(overrides = {}) {
    return {
        selfClaim: { claimsClaude: 0, claimsGPT: 0 },
        lexical: { usesDelve: 0, usesI_think: 0 },
        reasoning: { starts_with_letme: 0, uses_chain_of_thought: 0 },
        jsonDiscipline: { pure_json: 0, markdown_polluted: 0 },
        refusal: { softRefusal: 0 },
        listFormat: { bold_headers: 0, plain_numbered: 0 },
        subModelSignals: { avgSentenceLen: 0, vocabularyRichness: 0, hedgingRate: 0 },
        ...overrides,
    };
}
(0, vitest_1.describe)("flattenFeatures", () => {
    (0, vitest_1.it)("produces a consistent numeric array", () => {
        const f = makeFeatures({ selfClaim: { claimsClaude: 1, claimsGPT: 0 } });
        const vec = (0, sub_model_matcher_js_1.flattenFeatures)(f);
        (0, vitest_1.expect)(Array.isArray(vec)).toBe(true);
        (0, vitest_1.expect)(vec.every(v => typeof v === "number")).toBe(true);
        (0, vitest_1.expect)(vec.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("produces identical arrays for identical inputs", () => {
        const f1 = makeFeatures({ lexical: { usesDelve: 1, usesI_think: 0.5 } });
        const f2 = makeFeatures({ lexical: { usesDelve: 1, usesI_think: 0.5 } });
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.flattenFeatures)(f1)).toEqual((0, sub_model_matcher_js_1.flattenFeatures)(f2));
    });
    (0, vitest_1.it)("produces different arrays for different inputs", () => {
        const f1 = makeFeatures({ selfClaim: { claimsClaude: 1, claimsGPT: 0 } });
        const f2 = makeFeatures({ selfClaim: { claimsClaude: 0, claimsGPT: 1 } });
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.flattenFeatures)(f1)).not.toEqual((0, sub_model_matcher_js_1.flattenFeatures)(f2));
    });
});
(0, vitest_1.describe)("cosineSimilarity", () => {
    (0, vitest_1.it)("returns 1 for identical vectors", () => {
        const v = [1, 2, 3, 4];
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.cosineSimilarity)(v, v)).toBeCloseTo(1, 5);
    });
    (0, vitest_1.it)("returns 0 for orthogonal vectors", () => {
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.cosineSimilarity)([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });
    (0, vitest_1.it)("returns 0 for zero vectors", () => {
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.cosineSimilarity)([0, 0, 0], [1, 2, 3])).toBe(0);
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.cosineSimilarity)([0, 0], [0, 0])).toBe(0);
    });
    (0, vitest_1.it)("handles vectors of different lengths (uses min length)", () => {
        const a = [1, 0, 0];
        const b = [1, 0];
        // only first 2 elements compared: dot=1, magA=1, magB=1 → 1
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.cosineSimilarity)(a, b)).toBeCloseTo(1, 5);
    });
});
(0, vitest_1.describe)("matchSubModels", () => {
    const baseFeatures = makeFeatures({
        selfClaim: { claimsClaude: 1, claimsGPT: 0 },
        subModelSignals: { avgSentenceLen: 0.7, vocabularyRichness: 0.5, hedgingRate: 0.3 },
    });
    const refs = [
        {
            modelId: "claude-3.5-sonnet",
            family: "anthropic",
            featureVector: makeFeatures({
                selfClaim: { claimsClaude: 1, claimsGPT: 0 },
                subModelSignals: { avgSentenceLen: 0.7, vocabularyRichness: 0.5, hedgingRate: 0.3 },
            }),
        },
        {
            modelId: "claude-3-haiku",
            family: "anthropic",
            featureVector: makeFeatures({
                selfClaim: { claimsClaude: 1, claimsGPT: 0 },
                subModelSignals: { avgSentenceLen: 0.4, vocabularyRichness: 0.3, hedgingRate: 0.1 },
            }),
        },
        {
            modelId: "gpt-4o",
            family: "openai",
            featureVector: makeFeatures({
                selfClaim: { claimsClaude: 0, claimsGPT: 1 },
                subModelSignals: { avgSentenceLen: 0.6, vocabularyRichness: 0.6, hedgingRate: 0.2 },
            }),
        },
    ];
    (0, vitest_1.it)("filters by family", () => {
        const results = (0, sub_model_matcher_js_1.matchSubModels)(baseFeatures, refs, "anthropic");
        (0, vitest_1.expect)(results.every(r => r.modelId !== "gpt-4o")).toBe(true);
    });
    (0, vitest_1.it)("returns empty for unknown family", () => {
        (0, vitest_1.expect)((0, sub_model_matcher_js_1.matchSubModels)(baseFeatures, refs, "mistral")).toEqual([]);
    });
    (0, vitest_1.it)("ranks identical reference highest", () => {
        const results = (0, sub_model_matcher_js_1.matchSubModels)(baseFeatures, refs, "anthropic");
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(results[0].modelId).toBe("claude-3.5-sonnet");
        (0, vitest_1.expect)(results[0].similarity).toBeCloseTo(1, 2);
    });
    (0, vitest_1.it)("returns at most 5 candidates", () => {
        const manyRefs = Array.from({ length: 10 }, (_, i) => ({
            modelId: `model-${i}`,
            family: "test",
            featureVector: makeFeatures({ subModelSignals: { avgSentenceLen: i * 0.1 } }),
        }));
        const results = (0, sub_model_matcher_js_1.matchSubModels)(makeFeatures(), manyRefs, "test");
        (0, vitest_1.expect)(results.length).toBeLessThanOrEqual(5);
    });
});
//# sourceMappingURL=sub-model-matcher.test.js.map
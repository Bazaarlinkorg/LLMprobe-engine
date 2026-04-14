"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fingerprint_vectors_js_1 = require("../fingerprint-vectors.js");
(0, vitest_1.describe)("cosineSimilarity", () => {
    (0, vitest_1.it)("returns 1.0 for identical vectors", () => {
        (0, vitest_1.expect)((0, fingerprint_vectors_js_1.cosineSimilarity)([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    });
    (0, vitest_1.it)("returns 0.0 for orthogonal vectors", () => {
        (0, vitest_1.expect)((0, fingerprint_vectors_js_1.cosineSimilarity)([1, 0], [0, 1])).toBeCloseTo(0.0);
    });
    (0, vitest_1.it)("returns -1.0 for opposite vectors", () => {
        (0, vitest_1.expect)((0, fingerprint_vectors_js_1.cosineSimilarity)([1, 0], [-1, 0])).toBeCloseTo(-1.0);
    });
    (0, vitest_1.it)("returns 0 for zero vector", () => {
        (0, vitest_1.expect)((0, fingerprint_vectors_js_1.cosineSimilarity)([0, 0], [1, 0])).toBe(0);
    });
});
(0, vitest_1.describe)("pickTopVectorScores", () => {
    (0, vitest_1.it)("returns all-zero scores when no references given", () => {
        const scores = (0, fingerprint_vectors_js_1.pickTopVectorScores)([1, 0, 0], []);
        (0, vitest_1.expect)(scores.every((s) => s.score === 0)).toBe(true);
        (0, vitest_1.expect)(scores.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("returns normalized scores per family", () => {
        const queryEmbedding = [1, 0, 0];
        const refs = [
            { family: "anthropic", embedding: [1, 0, 0] }, // similarity = 1.0
            { family: "openai", embedding: [0, 1, 0] }, // similarity = 0.0
        ];
        const scores = (0, fingerprint_vectors_js_1.pickTopVectorScores)(queryEmbedding, refs);
        const anthropic = scores.find((s) => s.family === "anthropic");
        const openai = scores.find((s) => s.family === "openai");
        (0, vitest_1.expect)(anthropic?.score).toBeCloseTo(1.0);
        (0, vitest_1.expect)(openai?.score).toBeCloseTo(0.0);
    });
});
//# sourceMappingURL=fingerprint-vectors.test.js.map
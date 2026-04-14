"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fingerprint_fusion_js_1 = require("../fingerprint-fusion.js");
const FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];
function makeScores(family, score) {
    return FAMILIES.map(f => ({ family: f, score: f === family ? score : 0 }));
}
(0, vitest_1.describe)("fuseScores", () => {
    (0, vitest_1.it)("returns rule-only result when judge and vector are empty", () => {
        const rule = makeScores("anthropic", 1.0);
        const result = (0, fingerprint_fusion_js_1.fuseScores)(rule, [], []);
        const top = result[0];
        (0, vitest_1.expect)(top.family).toBe("anthropic");
        (0, vitest_1.expect)(top.score).toBeCloseTo(1.0);
    });
    (0, vitest_1.it)("judge vote boosts correct family", () => {
        const rule = makeScores("anthropic", 0.6);
        const judge = makeScores("openai", 1.0); // judge disagrees
        const result = (0, fingerprint_fusion_js_1.fuseScores)(rule, judge, []);
        // openai should win when judge strongly says so
        const openai = result.find(s => s.family === "openai");
        const anthropic = result.find(s => s.family === "anthropic");
        (0, vitest_1.expect)(openai.score).toBeGreaterThan(anthropic.score);
    });
    (0, vitest_1.it)("returns top 3 sorted descending", () => {
        const rule = makeScores("anthropic", 1.0);
        const result = (0, fingerprint_fusion_js_1.fuseScores)(rule, [], []);
        (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(3);
        (0, vitest_1.expect)(result[0].score).toBeGreaterThanOrEqual(result[1]?.score ?? 0);
    });
    (0, vitest_1.it)("excludes families with fused score 0", () => {
        const rule = makeScores("anthropic", 0.8);
        const judge = makeScores("anthropic", 0.9);
        const result = (0, fingerprint_fusion_js_1.fuseScores)(rule, judge, []);
        const allPositive = result.every(s => s.score > 0);
        (0, vitest_1.expect)(allPositive).toBe(true);
    });
});
//# sourceMappingURL=fingerprint-fusion.test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const canary_bench_js_1 = require("../canary-bench.js");
(0, vitest_1.describe)("CANARY_BENCH", () => {
    (0, vitest_1.it)("has at least 8 deterministic items with unique ids", () => {
        (0, vitest_1.expect)(canary_bench_js_1.CANARY_BENCH.length).toBeGreaterThanOrEqual(8);
        const ids = new Set(canary_bench_js_1.CANARY_BENCH.map(c => c.id));
        (0, vitest_1.expect)(ids.size).toBe(canary_bench_js_1.CANARY_BENCH.length);
    });
    (0, vitest_1.it)("every item has prompt and either expectedExact or expectedRegex", () => {
        for (const c of canary_bench_js_1.CANARY_BENCH) {
            (0, vitest_1.expect)(c.prompt.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(!!c.expectedExact || !!c.expectedRegex).toBe(true);
        }
    });
});
(0, vitest_1.describe)("scoreCanaryAnswer", () => {
    (0, vitest_1.it)("exact match passes (case/whitespace tolerant, trailing period stripped)", () => {
        const c = { id: "t", prompt: "", expectedExact: "Paris", category: "recall" };
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "Paris").passed).toBe(true);
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, " paris\n").passed).toBe(true);
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "Paris.").passed).toBe(true);
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "The capital is Paris").passed).toBe(false);
    });
    (0, vitest_1.it)("regex match passes when pattern matches trimmed actual", () => {
        const c = { id: "t", prompt: "", expectedRegex: "^30883$", category: "math" };
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "30883").passed).toBe(true);
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "30884").passed).toBe(false);
    });
    (0, vitest_1.it)("handles empty/null actual", () => {
        const c = { id: "t", prompt: "", expectedExact: "x", category: "math" };
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, "").passed).toBe(false);
        (0, vitest_1.expect)((0, canary_bench_js_1.scoreCanaryAnswer)(c, null).passed).toBe(false);
    });
});
//# sourceMappingURL=canary-bench.test.js.map
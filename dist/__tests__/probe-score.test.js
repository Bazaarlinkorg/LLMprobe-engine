"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const probe_score_js_1 = require("../probe-score.js");
function item(passed, status = "done", neutral = false) {
    return { passed, status, neutral };
}
(0, vitest_1.describe)("computeProbeScore", () => {
    (0, vitest_1.it)("returns 100/100 when all items pass", () => {
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(true), item(true)])).toEqual({ low: 100, high: 100 });
    });
    (0, vitest_1.it)("returns 0/0 when all items fail", () => {
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(false), item(false)])).toEqual({ low: 0, high: 0 });
    });
    (0, vitest_1.it)("returns 0/0 when no done items exist", () => {
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(null, "pending"), item(null, "pending")])).toEqual({ low: 0, high: 0 });
    });
    (0, vitest_1.it)("counts warning as 0.5 points", () => {
        // 1 pass + 1 warning / 2 done = 75
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item("warning")])).toEqual({ low: 75, high: 75 });
    });
    (0, vitest_1.it)("null items raise high but not low", () => {
        // 1 pass + 1 null / 2 done → low=50, high=100
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(null)])).toEqual({ low: 50, high: 100 });
    });
    (0, vitest_1.it)("multiple null items compound in high score", () => {
        // 0 pass + 3 null → low=0, high=100
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(null), item(null), item(null)])).toEqual({ low: 0, high: 100 });
    });
    (0, vitest_1.it)("excludes neutral items from scoring denominator", () => {
        // 2 pass (non-neutral) + 1 neutral warning → only 2 scored, score = 100/100
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(true), item("warning", "done", true)])).toEqual({ low: 100, high: 100 });
    });
    (0, vitest_1.it)("excludes neutral fails from denominator", () => {
        // 1 pass + 1 neutral false → denominator = 1, score = 100
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(false, "done", true)])).toEqual({ low: 100, high: 100 });
    });
    (0, vitest_1.it)("handles all-neutral items (returns 0/0)", () => {
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true, "done", true), item(false, "done", true)])).toEqual({ low: 0, high: 0 });
    });
    (0, vitest_1.it)("counts error status as a scored item", () => {
        // 1 pass + 1 error(false) → 2 done, low = 50, high = 50
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(false, "error")])).toEqual({ low: 50, high: 50 });
    });
    (0, vitest_1.it)("counts skipped as scored item", () => {
        // 1 pass + 1 skipped(null) → low=50, high=100
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([item(true), item(null, "skipped")])).toEqual({ low: 50, high: 100 });
    });
    (0, vitest_1.it)("mixed realistic scenario: 6 pass, 2 warning, 2 fail, 2 null", () => {
        // points = 6 + 1 = 7; nullCount = 2; done = 12
        // low = round(7/12*100) = 58, high = round(9/12*100) = 75
        const items = [
            ...Array(6).fill(null).map(() => item(true)),
            ...Array(2).fill(null).map(() => item("warning")),
            ...Array(2).fill(null).map(() => item(false)),
            ...Array(2).fill(null).map(() => item(null)),
        ];
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)(items)).toEqual({ low: 58, high: 75 });
    });
    (0, vitest_1.it)("returns 0/0 for empty input", () => {
        (0, vitest_1.expect)((0, probe_score_js_1.computeProbeScore)([])).toEqual({ low: 0, high: 0 });
    });
});
//# sourceMappingURL=probe-score.test.js.map
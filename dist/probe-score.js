"use strict";
// src/probe-score.ts — 0-100 score calculator (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProbeScore = computeProbeScore;
function computeProbeScore(items) {
    const done = items.filter(i => (i.status === "done" || i.status === "error" || i.status === "skipped") && !i.neutral);
    if (done.length === 0)
        return { low: 0, high: 0 };
    let points = 0;
    let nullCount = 0;
    for (const item of done) {
        if (item.passed === true)
            points += 1;
        else if (item.passed === "warning")
            points += 0.5;
        else if (item.passed === null)
            nullCount += 1;
    }
    const low = Math.round((points / done.length) * 100);
    const high = Math.round(((points + nullCount) / done.length) * 100);
    return { low, high };
}
//# sourceMappingURL=probe-score.js.map
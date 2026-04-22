"use strict";
// src/performance-fingerprint.ts — Extract TPS/TTFT performance signals from probe items
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPerformanceFeatures = extractPerformanceFeatures;
const TPS_MAX = 200; // normalization ceiling (tokens/sec)
const TTFT_MAX = 5000; // normalization ceiling (ms)
const TPS_SLOW = 60; // avg TPS below this → "slow model" (Opus, large models)
const TPS_FAST = 90; // avg TPS above this → "fast model" (Sonnet, smaller models)
const TTFT_FAST = 500; // avg TTFT below this (ms) → fast response
/**
 * Extract normalized TPS/TTFT features from a list of probe run items.
 * All values in [0, 1]. Returns zeros if no valid data.
 */
function extractPerformanceFeatures(items) {
    const tpsVals = items.map(i => i.tps).filter((v) => v != null && v > 0);
    const ttftVals = items.map(i => i.ttftMs).filter((v) => v != null && v > 0);
    if (tpsVals.length === 0 && ttftVals.length === 0) {
        return {
            avg_tps_norm: 0, avg_ttft_norm: 0,
            tps_slow: 0, tps_fast: 0, ttft_fast: 0,
        };
    }
    const avgTps = tpsVals.length > 0 ? tpsVals.reduce((a, b) => a + b, 0) / tpsVals.length : 0;
    const avgTtft = ttftVals.length > 0 ? ttftVals.reduce((a, b) => a + b, 0) / ttftVals.length : 0;
    return {
        avg_tps_norm: parseFloat(Math.min(1, avgTps / TPS_MAX).toFixed(3)),
        avg_ttft_norm: parseFloat(Math.min(1, Math.max(0, 1 - avgTtft / TTFT_MAX)).toFixed(3)),
        tps_slow: avgTps > 0 && avgTps < TPS_SLOW ? 1 : 0,
        tps_fast: avgTps > 0 && avgTps >= TPS_FAST ? 1 : 0,
        ttft_fast: avgTtft > 0 && avgTtft < TTFT_FAST ? 1 : 0,
    };
}
//# sourceMappingURL=performance-fingerprint.js.map
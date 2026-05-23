"use strict";
// src/fingerprint-bayesian.ts — Bayesian log-odds aggregator for family scoring.
//
// Replaces naive weighted-sum. Treats each feature as independent evidence,
// accumulates log-likelihood ratios per family, then softmax-normalizes into a
// proper probability distribution. Unobserved features contribute 0 log-odds
// (genuinely neutral), fixing the max-normalization bias of the old scorer.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLogLikelihood = toLogLikelihood;
exports.bayesianScore = bayesianScore;
exports.bayesianScoreDisplay = bayesianScoreDisplay;
exports.bayesianScoreDisplayCalibrated = bayesianScoreDisplayCalibrated;
/**
 * Convert a calibrated signal weight to a log-likelihood ratio contribution.
 * Calibration already produces log-odds-scale weights (e.g. w=2.0 ≈ e^2 ≈ 7.4x
 * evidence factor), so this is currently identity. Kept as a function so the
 * weight→log-odds mapping can be rescaled centrally if needed.
 */
function toLogLikelihood(weight) {
    return weight;
}
/**
 * Returns normalized family posteriors given observed features.
 * - Unobserved features (value 0) contribute 0 to log-odds (neutral)
 * - Observed features multiply log-odds by the weight
 * - Final scores are softmax-normalized probabilities summing to 1
 * - Sorted descending by score
 */
function bayesianScore(features, baselines) {
    const logOdds = {};
    for (const base of baselines) {
        let lo = 0;
        for (const [cat, key, w] of base.signals) {
            const catFeatures = features[cat] ?? {};
            const obs = catFeatures[key] ?? 0;
            if (obs === 0)
                continue;
            lo += toLogLikelihood(w) * obs;
        }
        logOdds[base.family] = lo;
    }
    // Softmax → probability distribution.
    // Subtract max for numerical stability before exp.
    const maxLo = Math.max(...Object.values(logOdds), 0);
    const expScores = {};
    for (const [f, lo] of Object.entries(logOdds)) {
        expScores[f] = Math.exp(lo - maxLo);
    }
    const total = Object.values(expScores).reduce((a, b) => a + b, 0);
    const normalized = Object.entries(expScores)
        .map(([family, ex]) => ({
        family,
        score: ex / total,
    }));
    normalized.sort((a, b) => b.score - a.score);
    return normalized;
}
/**
 * Temperature-scaled variant of bayesianScore for display purposes.
 * Pure softmax crushes scores to 0/1 when log-odds gaps are large (common
 * when selfClaim strongly favors one family). This version divides log-odds
 * by temperature before softmax, producing more human-readable spread.
 *
 * temperature=1.0 = same as bayesianScore (no scaling)
 * temperature=3.0 = moderate spread (recommended for UI)
 * temperature=10.0 = very flat (approaches uniform)
 *
 * Classification code should use bayesianScore (temperature=1). This function
 * is for UI display bars only.
 */
function bayesianScoreDisplay(features, baselines, temperature = 3.0) {
    const logOdds = {};
    for (const base of baselines) {
        let lo = 0;
        for (const [cat, key, w] of base.signals) {
            const catFeatures = features[cat] ?? {};
            const obs = catFeatures[key] ?? 0;
            if (obs === 0)
                continue;
            lo += toLogLikelihood(w) * obs;
        }
        logOdds[base.family] = lo;
    }
    const maxLo = Math.max(...Object.values(logOdds), 0);
    const expScores = {};
    for (const [f, lo] of Object.entries(logOdds)) {
        expScores[f] = Math.exp((lo - maxLo) / temperature);
    }
    const total = Object.values(expScores).reduce((a, b) => a + b, 0);
    const normalized = Object.entries(expScores)
        .map(([family, ex]) => ({
        family,
        score: ex / total,
    }));
    normalized.sort((a, b) => b.score - a.score);
    return normalized;
}
/**
 * Display-oriented score with the same ranking as bayesianScoreDisplay, but
 * with an evidence/margin cap on the winner. This prevents a single strong
 * self-claim or a tiny set of signals from rendering as "100%" certainty.
 */
function bayesianScoreDisplayCalibrated(features, baselines, options = {}) {
    const temperature = options.temperature ?? 2.0;
    const logOdds = {};
    const evidenceMass = {};
    for (const base of baselines) {
        let lo = 0;
        let mass = 0;
        for (const [cat, key, w] of base.signals) {
            const catFeatures = features[cat] ?? {};
            const obs = catFeatures[key] ?? 0;
            if (obs === 0)
                continue;
            lo += toLogLikelihood(w) * obs;
            mass += Math.abs(w * obs);
        }
        logOdds[base.family] = lo;
        evidenceMass[base.family] = mass;
    }
    const maxLo = Math.max(...Object.values(logOdds), 0);
    const expScores = {};
    for (const [f, lo] of Object.entries(logOdds)) {
        expScores[f] = Math.exp((lo - maxLo) / temperature);
    }
    const total = Object.values(expScores).reduce((a, b) => a + b, 0) || 1;
    const normalized = Object.entries(expScores)
        .map(([family, ex]) => ({ family, score: ex / total }))
        .sort((a, b) => b.score - a.score);
    if (!options.calibrateTopScore || normalized.length < 2)
        return normalized;
    const winner = normalized[0];
    const second = normalized[1];
    const margin = (logOdds[winner.family] ?? 0) - (logOdds[second.family] ?? 0);
    const mass = evidenceMass[winner.family] ?? 0;
    const cap = Math.min(0.98, 0.45 +
        0.055 * Math.min(6, Math.max(0, mass)) +
        0.045 * Math.min(5, Math.max(0, margin)));
    if (winner.score <= cap)
        return normalized;
    const remainder = 1 - cap;
    const otherTotal = normalized.slice(1).reduce((s, row) => s + row.score, 0) || 1;
    return [
        { family: winner.family, score: cap },
        ...normalized.slice(1).map((row) => ({
            family: row.family,
            score: remainder * (row.score / otherTotal),
        })),
    ];
}
//# sourceMappingURL=fingerprint-bayesian.js.map
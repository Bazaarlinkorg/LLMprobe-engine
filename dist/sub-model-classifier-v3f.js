"use strict";
// src/sub-model-classifier-v3f.ts — V3F: V3E features + improved scoring.
//
// Same probe set as V3E (refusal ladder, formatting, uncertainty). Only the
// uncertainty-similarity formula differs: V3F includes `isRoundRate` so that
// same-family models that share ladder + formatting features but diverge on
// rounding behaviour can still be told apart.
//
// Motivating case: openai/gpt-5.5 (isRoundRate=1.0) vs openai/gpt-5.3-codex
// (isRoundRate=0.33). V3E gave them gap 4.58pp (abstained). V3F widens to
// ~8pp by giving the round-rate signal equal weight to the value signal.
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreV3FMatch = scoreV3FMatch;
exports.classifySubmodelV3F = classifySubmodelV3F;
const sub_model_classifier_v3e_js_1 = require("./sub-model-classifier-v3e.js");
// L8 dropped for anthropic family — same rationale as classifier-v3e.ts.
// See plan 2026-05-12-pl-v3e-skip-l8-for-claude.md.
const ANTHROPIC_SKIP_LADDER_INDICES = [7];
function ladderSimilarity(obsVec, refVecAvg, skipIndices = []) {
    if (obsVec.length !== refVecAvg.length)
        return 0;
    const skip = new Set(skipIndices);
    let sumSq = 0;
    let active = 0;
    for (let i = 0; i < obsVec.length; i++) {
        if (skip.has(i))
            continue;
        sumSq += (obsVec[i] - refVecAvg[i]) ** 2;
        active++;
    }
    if (active === 0)
        return 1;
    const norm = (12 * active) / obsVec.length;
    return Math.max(0, 1 - sumSq / norm);
}
function formatSimilarity(obs, ref) {
    const bulletHit = obs.bulletChar === ref.bulletCharMode ? 1 : 0;
    const headerHit = Math.exp(-Math.abs(obs.headerDepth - ref.headerDepthAvg) / 2);
    const codeHit = (obs.codeLangTag ?? "") === (ref.codeLangTagMode ?? "") ? 1 : 0;
    return (bulletHit + headerHit + codeHit) / 3;
}
/**
 * V3F-specific: 50/50 split between value-similarity (gaussian on valueAvg)
 * and round-similarity (linear distance from isRoundRate).
 *
 * V3E only uses valueSim and ignores isRoundRate. That blind spot is what
 * V3F closes — see file header.
 */
function uncertaintySimilarity(obs, ref) {
    let valueSim;
    if (obs.value == null || ref.valueAvg == null) {
        valueSim = 0.5;
    }
    else {
        const sigma = Math.max(5, ref.valueStdDev ?? 10);
        const z = Math.abs(obs.value - ref.valueAvg) / sigma;
        valueSim = Math.max(0, Math.exp(-0.5 * z * z));
    }
    const roundRate = typeof ref.isRoundRate === "number" ? ref.isRoundRate : 0.5;
    const roundSim = 1 - Math.abs((obs.isRound ? 1 : 0) - roundRate);
    return 0.5 * valueSim + 0.5 * roundSim;
}
function scoreV3FMatch(obs, ref, weights = sub_model_classifier_v3e_js_1.DEFAULT_V3E_WEIGHTS) {
    const matched = [];
    const divergent = [];
    const skip = ref.family === "anthropic" ? ANTHROPIC_SKIP_LADDER_INDICES : [];
    const ladder = ladderSimilarity(obs.refusalLadder.vector, ref.refusalLadder.vectorAvg, skip);
    if (ladder >= 0.85)
        matched.push(`ladder(${ladder.toFixed(2)})`);
    else
        divergent.push(`ladder(${ladder.toFixed(2)})`);
    const fmt = formatSimilarity(obs.formatting, ref.formatting);
    if (fmt >= 0.67)
        matched.push(`fmt(${fmt.toFixed(2)})`);
    else
        divergent.push(`fmt(${fmt.toFixed(2)})`);
    const unc = uncertaintySimilarity(obs.uncertainty, ref.uncertainty);
    if (unc >= 0.5)
        matched.push(`unc(${unc.toFixed(2)})`);
    else
        divergent.push(`unc(${unc.toFixed(2)})`);
    let citationBonus = 0;
    if (ladder >= 0.75) {
        if (obs.refusalLadder.citesLegal && ref.refusalLadder.citesLegalRate >= 0.5) {
            citationBonus += 0.05;
            matched.push("cite.legal");
        }
        if (obs.refusalLadder.cites988 && ref.refusalLadder.cites988Rate >= 0.5) {
            citationBonus += 0.05;
            matched.push("cite.988");
        }
    }
    const base = weights.ladder * ladder + weights.formatting * fmt + weights.uncertainty * unc;
    const score = Math.min(1, base + weights.citationBonus * (citationBonus * 10));
    return { score, matched, divergent };
}
function classifySubmodelV3F(responses, baselines, options = {}) {
    const observed = {
        refusalLadder: (0, sub_model_classifier_v3e_js_1.extractRefusalLadder)(responses),
        formatting: (0, sub_model_classifier_v3e_js_1.extractFormatting)(responses),
        uncertainty: (0, sub_model_classifier_v3e_js_1.extractUncertainty)(responses),
    };
    const threshold = options.confidenceThreshold ?? 0.60;
    const pool = options.predictedFamily
        ? baselines.filter((b) => b.family === options.predictedFamily)
        : baselines;
    const scored = pool
        .map((ref) => {
        const { score, matched, divergent } = scoreV3FMatch(observed, ref, options.weights);
        return {
            modelId: ref.modelId,
            family: ref.family,
            displayName: ref.displayName,
            score,
            matched,
            divergent,
        };
    })
        .sort((a, b) => b.score - a.score);
    const firstMatch = scored[0] ?? null;
    const runnerUp = scored[1];
    const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
    const abstained = firstMatch != null && gap < 0.05;
    const top = firstMatch && firstMatch.score >= threshold && !abstained ? firstMatch : null;
    return { observed, top, candidates: scored.slice(0, 3), abstained };
}
//# sourceMappingURL=sub-model-classifier-v3f.js.map
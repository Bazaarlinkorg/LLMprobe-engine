"use strict";
// lib/sub-model-bayesian.ts — Posterior over sub-models via log-likelihood sum + softmax.
//
// Baselines are loaded from the DB (prisma.modelFingerprint) at the call site and
// passed in here. No static data — the single source of truth is the prodadmin
// baseline system (ModelFingerprint table, featureVector.subModelWeights).
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIDENCE_THRESHOLD = void 0;
exports.scoreSubModels = scoreSubModels;
/** Required top-1 posterior probability to claim a sub-model identification. */
exports.CONFIDENCE_THRESHOLD = 0.95;
const EMPTY_TOP = { modelId: "", posterior: 0 };
/**
 * Score observed features against a cohort of same-family sub-model baselines.
 * - Returns an abstain result when fewer than 2 baselines are present (nothing to distinguish).
 * - Aggregates per-model log-odds, softmax-normalizes into a probability distribution,
 *   then flags abstain when the top posterior is below CONFIDENCE_THRESHOLD.
 */
function scoreSubModels(features, baselines) {
    if (baselines.length < 2) {
        return { candidates: [], top: EMPTY_TOP, abstained: true };
    }
    const logOdds = {};
    for (const base of baselines) {
        let lo = 0;
        for (const [feat, w] of base.weights) {
            const obs = features[feat] ?? 0;
            if (obs === 0)
                continue;
            lo += w * obs;
        }
        logOdds[base.modelId] = lo;
    }
    const maxLo = Math.max(...Object.values(logOdds));
    const exps = {};
    for (const [m, lo] of Object.entries(logOdds)) {
        exps[m] = Math.exp(lo - maxLo);
    }
    const total = Object.values(exps).reduce((a, b) => a + b, 0);
    const candidates = Object.entries(exps)
        .map(([modelId, e]) => ({ modelId, posterior: e / total }))
        .sort((a, b) => b.posterior - a.posterior);
    const top = candidates[0] ?? EMPTY_TOP;
    return {
        candidates,
        top,
        abstained: top.posterior < exports.CONFIDENCE_THRESHOLD,
    };
}
//# sourceMappingURL=sub-model-bayesian.js.map
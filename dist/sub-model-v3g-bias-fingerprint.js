"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3H_ACTIVE_PROMPT_POLICIES = void 0;
exports.filterFreshBiasBaselines = filterFreshBiasBaselines;
exports.scoreBiasFingerprint = scoreBiasFingerprint;
exports.policyForCandidates = policyForCandidates;
exports.hasV3HSeparator = hasV3HSeparator;
exports.selectBiasProbesForCandidates = selectBiasProbesForCandidates;
exports.scoreV3HDistributionFingerprint = scoreV3HDistributionFingerprint;
exports.isStrongPassByPolicy = isStrongPassByPolicy;
exports.requiredStrongPassGap = requiredStrongPassGap;
exports.isFalseAbstain = isFalseAbstain;
exports.regateV3HResult = regateV3HResult;
exports.candidateSiblingsFor = candidateSiblingsFor;
exports.candidateSiblingsForFamily = candidateSiblingsForFamily;
exports.candidateSiblingsForConfirmedFamily = candidateSiblingsForConfirmedFamily;
exports.biasDisplayName = biasDisplayName;
exports.shouldFillSubModelFromV3G = shouldFillSubModelFromV3G;
exports.shouldPromoteSubModelFromV3H = shouldPromoteSubModelFromV3H;
exports.sampleBiasFingerprint = sampleBiasFingerprint;
exports.sampleV3HDistributionFingerprint = sampleV3HDistributionFingerprint;
// lib/sub-model/v3g-bias-fingerprint.ts
// Pure classifier for the V3G bias-fingerprint layer. Given a set of border-probe
// observations (each = the N sampled answers for one probe) and ≥2 candidate sibling
// baselines, score each candidate by summed Laplace-smoothed log-likelihood and return
// the softmax posterior. Abstains on too-few-candidates / empty obs / low confidence, so
// it never forces a call on a weak signal.
const sub_model_bias_probes_1 = require("./sub-model-bias-probes");
const model_id_normalize_1 = require("./model-id-normalize");
/** H5 freshness partition. Distributions drift as vendors retrain, so age matters — but a
 *  drifted baseline is still the best signal we have and MUST NOT silently disappear
 *  (Task 9a: a hard drop around 2026-12-29 would kill V3H everywhere). So:
 *  - `fresh`   — valid metadata, within maxAge, well-sampled → primary candidates.
 *  - `expired` — valid metadata, OLDER than maxAge → STILL USABLE with full authority; the
 *                caller uses `[...fresh, ...expired]` and only FLAGS the run as running on
 *                stale data (so the operator can refresh — wiring is a separate task).
 *  - `dropped` — `missing-metadata` / `thin-sample` → fail-closed, NOT usable (an unstamped
 *                or thin distribution cannot prove it isn't rotted). Default: 180 days / 100. */
function filterFreshBiasBaselines(baselines, opts) {
    const now = opts?.now ?? Date.now();
    const maxAgeDays = opts?.maxAgeDays ?? 180;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const minSampleCount = opts?.minSampleCount ?? 100;
    const fresh = [];
    const expired = [];
    const dropped = [];
    for (const b of baselines) {
        const captured = b.capturedAt ? Date.parse(b.capturedAt) : NaN;
        if (!b.capturedAt || !Number.isFinite(captured) || typeof b.sampleCount !== "number") {
            dropped.push({ modelId: b.modelId, reason: "missing-metadata" });
        }
        else if (b.sampleCount < minSampleCount) {
            dropped.push({ modelId: b.modelId, reason: "thin-sample" });
        }
        else if (now - captured > maxAgeMs) {
            // Stale-but-valid: retains full authority (Task 9a), only flagged. expiredDays = whole
            // days past the maxAge line (floor), so it is 0 the day it crosses and grows from there.
            const expiredDays = Math.floor((now - captured - maxAgeMs) / (24 * 60 * 60 * 1000));
            expired.push({ modelId: b.modelId, expiredDays, baseline: b });
        }
        else {
            fresh.push(b);
        }
    }
    return { fresh, expired, dropped };
}
exports.V3H_ACTIVE_PROMPT_POLICIES = [
    {
        id: "deepseek-v4-flash-pro",
        modelIds: ["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"],
        activeProbeIds: ["rand_letter", "rand_color", "rand_country"],
        minConfidence: 0.78,
        minLogLikelihoodGap: 1.2,
        minProbeVoteMargin: 1,
        empiricalAccuracyFloor: 0.9,
        allowSameFamilyOverride: true,
        // -3.5 ate ~7% true-sibling recall on this pair (offline gate overall 84% < 90%);
        // -3.8 keeps the all-unseen imposter (avg ≈ -4.6) excluded while restoring recall.
        minAvgLogLikelihood: -3.8,
        minStrongPassSampleCount: 6, // 2 × 3 active probes
    },
    {
        id: "openai-gpt55-codex53",
        modelIds: ["openai/gpt-5.5", "openai/gpt-5.3-codex"],
        activeProbeIds: ["rand_1to100", "rand_animal", "rand_country", "rand_color"],
        minConfidence: 0.85,
        minLogLikelihoodGap: 1.5,
        minProbeVoteMargin: 1,
        empiricalAccuracyFloor: 0.98,
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.5,
        minStrongPassSampleCount: 8, // 2 × 4 active probes
    },
    {
        id: "zhipu-glm-cluster",
        modelIds: ["z-ai/glm-5", "z-ai/glm-5.1", "z-ai/glm-5.2"],
        // 10 discriminators discovered FOR this cluster (tmp/discover-glm-probes.ts) —
        // the generic border set could not separate glm-5.1 vs glm-5.2, but these do:
        // held-out (train N=60 / test N=50, two independent samples) = 99.6% correct,
        // 0% wrong, 0.4% abstain, aggregated over 3 samples/probe.
        activeProbeIds: ["day", "rand_dwarf", "rand_gem", "rand_month", "rand_city", "rand_bird", "rand_element", "rand_bignum", "rand_fruit"],
        // Thresholds tuned (tmp/tune-glm-noise.ts) so a sparse residue under HEAVY relay
        // noise (thin-60% + blank-10%) ABSTAINS instead of flipping to a sibling —
        // baseline-gate noise-invariant = 0 offenders across 40 seeds × 3 models. The
        // 5.1/5.2 pair is adjacent (closer than the deepseek/anthropic clusters), so the
        // vote-margin + gap + avgLL floors are held tighter than those policies. minConf
        // sits at 0.94 — below the 0.95 strong-pass bar so it never falseAbstains a
        // decisive posterior, and below the H1 standard-pass fixture bound (0.94).
        // Clean 3-sample held-out: 99.3% correct, 0% wrong.
        minConfidence: 0.94,
        minLogLikelihoodGap: 2.5,
        minProbeVoteMargin: 3,
        empiricalAccuracyFloor: 0.95, // documented offline held-out non-abstain accuracy; DIAGNOSTIC ONLY
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.2,
        minStrongPassSampleCount: 18, // 2 × 9 active probes
    },
    {
        // GPT-5.6 launch (2026-07-09): luna/terra join gpt-5.5 + codex as one family cluster —
        // candidateSiblingsForConfirmedFamily("openai") now yields this 4-model set, so the old
        // 2-model openai-gpt55-codex53 policy no longer matches at runtime (kept below for
        // historical replay/regate). 9 active probes = the GLM-discovered discriminators that
        // survived 4-way validation (tmp/validate-gpt56-v3h.ts, train N=60 / test N=50 held-out,
        // two independent samples per model): 99.1% correct, 0% wrong, imposter 0% non-abstain.
        // Noise-invariant (tmp/tune-gpt56-noise.ts): thin-60%+blank-10% residue → 0 offenders,
        // clean Monte-Carlo 99.7% @ vote-margin 2. Luna↔Terra separate on near-orthogonal modes
        // (quokka↔axolotl, sparrow↔kingfisher, amethyst↔sapphire, bhutan↔lesotho, kyoto↔valparaíso).
        id: "openai-gpt5x-cluster",
        // Sol added 2026-07-10 (the $5/$30 flagship — the most lucrative id for a relay to claim
        // while serving $1/$6 Luna). 5-way held-out under the SAME thresholds: 98.0% correct,
        // 0% wrong, imposter 0% non-abstain.
        modelIds: ["openai/gpt-5.6-luna", "openai/gpt-5.6-terra", "openai/gpt-5.6-sol", "openai/gpt-5.5", "openai/gpt-5.3-codex"],
        activeProbeIds: ["rand_bird", "rand_gem", "rand_city", "rand_fruit", "rand_animal", "rand_country", "rand_1to100", "rand_month", "rand_bignum"],
        minConfidence: 0.94,
        minLogLikelihoodGap: 2.5,
        minProbeVoteMargin: 2,
        empiricalAccuracyFloor: 0.99, // documented offline held-out gated accuracy (0% wrong); DIAGNOSTIC ONLY
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.2,
        minStrongPassSampleCount: 18, // 2 × 9 active probes
    },
    {
        // xAI cluster (2026-07-10). grok-4.5 ($2/$6) vs grok-4.3 ($1.25/$2.5) — a 1.6×/2.4× cost
        // gap, so serving 4.3 behind a 4.5 claim is the obvious substitution. Both baselines were
        // sampled at N=60 (train) / N=50 (test), two independent OR-pinned draws. Held-out over ALL
        // 15 border probes: 99.0% correct, 0% wrong, imposter 0% non-abstain. The full set is kept
        // (rather than a discovered subset) because no probe is a dud here — the weakest, rand_bird,
        // still separates at 56.5%, and rand_dwarf/day/rand_gem carry it (92.6/81.9/80.8%).
        id: "xai-grok-cluster",
        modelIds: ["x-ai/grok-4.5", "x-ai/grok-4.3"],
        activeProbeIds: ["rand_country", "rand_1to100", "rand_animal", "rand_color", "rand_letter", "day", "zero_natural", "rand_dwarf", "rand_gem", "rand_month", "rand_city", "rand_bird", "rand_element", "rand_bignum", "rand_fruit"],
        minConfidence: 0.94,
        minLogLikelihoodGap: 2.5,
        minProbeVoteMargin: 2,
        empiricalAccuracyFloor: 0.99, // documented offline held-out gated accuracy (0% wrong); DIAGNOSTIC ONLY
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.2,
        minStrongPassSampleCount: 30, // 2 × 15 active probes
    },
    {
        id: "anthropic-claude-cluster",
        modelIds: [
            "anthropic/claude-opus-4.5", "anthropic/claude-opus-4.6", "anthropic/claude-opus-4.7",
            "anthropic/claude-opus-4.8", "anthropic/claude-opus-5", "anthropic/claude-sonnet-4.5",
            "anthropic/claude-sonnet-4.6", "anthropic/claude-sonnet-5", "anthropic/claude-haiku-4.5",
            "anthropic/claude-fable-5",
        ],
        // All 7 border probes: the full set gave the best gated result (95.5% correct, 0% wrong);
        // dropping day/1to100 lowered min recall (they still add aggregate signal for the gates).
        activeProbeIds: ["rand_country", "rand_1to100", "rand_animal", "rand_color", "rand_letter", "day", "zero_natural"],
        minConfidence: 0.85,
        minLogLikelihoodGap: 1.5,
        minProbeVoteMargin: 1,
        // 2026-07-25, claude-opus-5 admitted as the 10th member. Held-out
        // re-measurement (10 models × 10 trials × 7 probes × 3 samples) scored
        // 100/100 decisive, 0 wrong, 0 abstain. The floor is NOT set to 1.0: at
        // n=100 with zero errors the rule-of-three 95% lower bound is
        // 1 − 3/100 = 0.97, so 0.97 is the strongest honestly-supportable claim.
        // Raise it only against a materially larger held-out run. DIAGNOSTIC
        // ONLY — gates nothing at runtime; the real per-run gates are the four
        // floors below.
        empiricalAccuracyFloor: 0.97,
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.8,
        minStrongPassSampleCount: 14, // 2 × 7 active probes — blocks the ~7-sample starvation flip (vote -1)
    },
];
const SMOOTH_DENOM = 60; // Laplace vocab estimate; matches the tmp/ experiments
function logLik(answers, dist) {
    const d = dist ?? {};
    const n = Object.values(d).reduce((a, b) => a + b, 0) || 1;
    let s = 0;
    for (const a of answers)
        s += Math.log(((d[a] || 0) + 1) / (n + SMOOTH_DENOM));
    return s;
}
function scoreBiasFingerprint(obs, candidates, opts) {
    const minConfidence = opts?.minConfidence ?? 0.9;
    const empty = { topModel: null, confidence: 0, scores: {}, perProbe: [], abstained: true };
    const usableObs = obs.filter((o) => o.answers.length > 0);
    if (candidates.length < 2 || usableObs.length === 0)
        return empty;
    const scores = {};
    for (const c of candidates)
        scores[c.modelId] = 0;
    const perProbe = [];
    for (const o of usableObs) {
        let best = null, bestLL = -Infinity;
        for (const c of candidates) {
            const ll = logLik(o.answers, c.probes[o.probeId]);
            scores[c.modelId] += ll;
            if (ll > bestLL) {
                bestLL = ll;
                best = c.modelId;
            }
        }
        perProbe.push({ probeId: o.probeId, topModel: best });
    }
    // softmax posterior over summed log-likelihoods
    const entries = Object.entries(scores);
    const maxS = Math.max(...entries.map(([, v]) => v));
    const exps = entries.map(([m, v]) => [m, Math.exp(v - maxS)]);
    const Z = exps.reduce((a, [, e]) => a + e, 0) || 1;
    const posteriors = exps.map(([m, e]) => [m, e / Z]).sort((a, b) => b[1] - a[1]);
    const [topModel, confidence] = posteriors[0];
    if (confidence < minConfidence)
        return { topModel: null, confidence, scores, perProbe, abstained: true };
    return { topModel, confidence, scores, perProbe, abstained: false };
}
function sortedModelIds(items) {
    return items.map((x) => x.modelId).sort();
}
function sameModelSet(a, b) {
    if (a.length !== b.length)
        return false;
    const as = [...a].sort();
    const bs = [...b].sort();
    return as.every((v, i) => v === bs[i]);
}
function policyForCandidates(candidates) {
    const ids = sortedModelIds(candidates);
    return exports.V3H_ACTIVE_PROMPT_POLICIES.find((p) => sameModelSet(p.modelIds, ids)) ?? null;
}
/** True when some active V3H border policy covers BOTH model ids — i.e. the
 *  claimed↔detected sibling pair is one we can actually separate at the border.
 *  Used by the verdict to decide whether a confident-but-lone V3 "different
 *  sibling" call is trustworthy enough to assert a substitution (已替換). For
 *  clusters with no policy (GLM/qwen/gemini/…) this returns false and the
 *  verdict stays family_only. Ids are normalized (dash/dot, org prefix). */
function hasV3HSeparator(a, b) {
    return exports.V3H_ACTIVE_PROMPT_POLICIES.some((p) => p.modelIds.some((m) => (0, model_id_normalize_1.modelIdsMatch)(m, a)) &&
        p.modelIds.some((m) => (0, model_id_normalize_1.modelIdsMatch)(m, b)));
}
function selectBiasProbesForCandidates(probes, candidates) {
    const policy = policyForCandidates(candidates);
    if (!policy)
        return probes;
    const byId = new Map(probes.map((p) => [p.id, p]));
    const selected = policy.activeProbeIds.map((id) => byId.get(id)).filter((p) => !!p);
    return selected.length > 0 ? selected : probes;
}
function posteriorFromScores(scores) {
    const entries = Object.entries(scores);
    if (entries.length === 0)
        return [];
    const maxS = Math.max(...entries.map(([, v]) => v));
    const exps = entries.map(([modelId, v]) => ({ modelId, e: Math.exp(v - maxS) }));
    const z = exps.reduce((a, x) => a + x.e, 0) || 1;
    return exps
        .map((x) => ({ modelId: x.modelId, score: x.e / z }))
        .sort((a, b) => b.score - a.score);
}
function voteMargin(perProbe, topModel) {
    if (!topModel)
        return 0;
    const counts = {};
    for (const p of perProbe)
        if (p.topModel)
            counts[p.topModel] = (counts[p.topModel] ?? 0) + 1;
    const top = counts[topModel] ?? 0;
    const runner = Math.max(0, ...Object.entries(counts).filter(([m]) => m !== topModel).map(([, c]) => c));
    return top - runner;
}
function scoreV3HDistributionFingerprint(obs, candidates, opts) {
    const policy = policyForCandidates(candidates);
    const activeProbeIds = policy?.activeProbeIds ?? [...new Set(obs.map((o) => o.probeId))];
    const activeSet = new Set(activeProbeIds);
    const usableObs = obs.filter((o) => activeSet.has(o.probeId) && o.answers.length > 0);
    const base = scoreBiasFingerprint(usableObs, candidates, { minConfidence: 0 });
    const posteriors = posteriorFromScores(base.scores);
    const top = posteriors[0] ?? null;
    const runner = posteriors[1] ?? null;
    const topScore = top ? base.scores[top.modelId] ?? -Infinity : -Infinity;
    const runnerScore = runner ? base.scores[runner.modelId] ?? -Infinity : -Infinity;
    const logLikelihoodGap = Number.isFinite(topScore - runnerScore) ? topScore - runnerScore : 0;
    const probeVoteMargin = voteMargin(base.perProbe, top?.modelId ?? null);
    const sampleCount = usableObs.reduce((n, o) => n + o.answers.length, 0);
    const avgLogLikelihood = sampleCount > 0 && Number.isFinite(topScore) ? topScore / sampleCount : -Infinity;
    const minConfidence = opts?.minConfidence ?? policy?.minConfidence ?? 0.9;
    const minLogLikelihoodGap = opts?.minLogLikelihoodGap ?? policy?.minLogLikelihoodGap ?? 0;
    const minProbeVoteMargin = opts?.minProbeVoteMargin ?? policy?.minProbeVoteMargin ?? 0;
    const minAvgLogLikelihood = opts?.minAvgLogLikelihood ?? policy?.minAvgLogLikelihood ?? -3.5;
    const minStrongPassSampleCount = policy?.minStrongPassSampleCount ?? 0;
    // STRONG PASS (validated policy only): a decisive posterior clears confidence,
    // 2× the calibrated log-likelihood gap, and the avg-log-likelihood fit floor.
    // Only then is the per-probe vote-margin term waived — the margin is meaningful
    // for 2-model pairs but noise for the 9-model Claude cluster, where it silences
    // 100%-posterior calls. It stays required for STANDARD (below-strong) results.
    // H6 SAMPLE FLOOR: a STRICTLY-NEGATIVE vote-margin is only waivable once samples reach
    // minStrongPassSampleCount. Below that, a negative margin is real per-probe disagreement
    // (a starved ≈1/probe residue fitting a sibling), not cluster-scatter — so such a thin
    // result does NOT strong-pass and falls back to the standard vote-margin gate (→ abstains).
    const strongPass = !!policy &&
        !!top &&
        base.confidence >= 0.95 &&
        logLikelihoodGap >= 2 * minLogLikelihoodGap &&
        avgLogLikelihood >= minAvgLogLikelihood &&
        (probeVoteMargin >= 0 || sampleCount >= minStrongPassSampleCount);
    const passes = !!top &&
        base.confidence >= minConfidence &&
        logLikelihoodGap >= minLogLikelihoodGap &&
        (strongPass || probeVoteMargin >= minProbeVoteMargin) &&
        avgLogLikelihood >= minAvgLogLikelihood;
    return {
        ...base,
        topModel: passes ? top.modelId : null,
        abstained: !passes,
        version: "v3h",
        policyId: policy?.id ?? null,
        activeProbeIds,
        sampleCount,
        runnerUpModel: runner?.modelId ?? null,
        logLikelihoodGap,
        probeVoteMargin,
        posteriors,
        empiricalAccuracyFloor: policy?.empiricalAccuracyFloor ?? null,
        avgLogLikelihood,
        strongPass,
        // Telemetry-only; the route overwrites this with the expired ids that were scored. The
        // scorer has no freshness metadata (candidates are plain baselines), so it defaults to [].
        usedExpiredBaselines: [],
    };
}
/**
 * The STRONG-PASS decisiveness test, computed from a result's aggregate fields against a
 * VALIDATED policy's fixed thresholds. This is the SINGLE SOURCE OF TRUTH for the strong-pass
 * criteria (confidence ≥ 0.95, logLikelihoodGap ≥ 2× the policy min, avgLL ≥ the policy floor,
 * AND the H6 vote/sample clause: a strictly-negative vote-margin is only waivable once samples
 * reach the policy's minStrongPassSampleCount). It MUST stay identical to the strongPass
 * computation in scoreV3HDistributionFingerprint; both `regateV3HResult` and `isFalseAbstain`
 * call this so those thresholds cannot drift apart. Pre-H4 rows (avgLogLikelihood null / not
 * finite) are not scorable → false. Exported so the read-only tripwire
 * (scripts/audit-v3h-contradictions.mts) applies the EXACT same predicate instead of an inline copy.
 */
function isStrongPassByPolicy(policy, r) {
    if (r.avgLogLikelihood == null || !Number.isFinite(r.avgLogLikelihood))
        return false;
    const sampleFloor = policy.minStrongPassSampleCount ?? 0;
    return (r.confidence >= 0.95 &&
        r.logLikelihoodGap >= 2 * policy.minLogLikelihoodGap &&
        r.avgLogLikelihood >= policy.minAvgLogLikelihood &&
        (r.probeVoteMargin >= 0 || r.sampleCount >= sampleFloor));
}
/** The raw log-likelihood-gap a result must clear to strong-pass under `policyId` —
 *  i.e. `2 × policy.minLogLikelihoodGap` (the exact bound in isStrongPassByPolicy).
 *  Returned to DISPLAY surfaces so an unconfirmed sub-model can honestly show
 *  "指紋差距 {gap} < {requiredGap}" instead of a softmax % that reads as certainty.
 *  Null when the policyId is unknown (no bound to cite). */
function requiredStrongPassGap(policyId) {
    const p = exports.V3H_ACTIVE_PROMPT_POLICIES.find((x) => x.id === policyId);
    return p ? 2 * p.minLogLikelihoodGap : null;
}
/** A result that abstained even though its posterior was DECISIVE by the strong-pass
 *  criteria of its own validated policy. Counted as a FAILURE — an over-conservative
 *  gate silences the most accurate signal (2026-07-03 incident: 15 runs). Uses the shared
 *  `isStrongPassByPolicy` predicate, so its thresholds cannot drift from the scorer's. */
function isFalseAbstain(r) {
    if (!r.abstained)
        return false;
    const policy = exports.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === r.policyId);
    if (!policy)
        return false;
    return isStrongPassByPolicy(policy, r);
}
/**
 * Recompute the V3H strong-pass / abstain / topModel DECISION from a V3HResult's OWN aggregate
 * fields (confidence, logLikelihoodGap, avgLogLikelihood, probeVoteMargin, posteriors, policyId)
 * under the CURRENT policy table — WITHOUT re-running the fuse over raw samples.
 *
 * Purpose: replay/audit. A stored/historical V3HResult carries the summed-log-likelihood
 * aggregates that were computed live from the FULL (non-truncated) border samples; those
 * aggregates are truncation-independent and faithful. This lets a regression gate re-derive the
 * gate outcome under today's thresholds from a frozen result, instead of trusting the stored
 * (possibly post-fix) `abstained`/`strongPass`/`topModel` — which would be circular — or
 * re-running the fuse over truncated responses — which does not reproduce the live pick.
 *
 * The math MUST stay identical to the gate in scoreV3HDistributionFingerprint (see the strongPass
 * / passes computation ~lines 274-285); if that gate changes, this recompute changes with it.
 * Read-only: returns a new V3HResult; the input is not mutated and the scorer is untouched.
 *
 * Fail-closed: an unknown policyId (no calibrated policy) forces abstain, mirroring the scorer's
 * H3 default (a candidate set with no validated policy must not promote).
 */
function regateV3HResult(r) {
    const policy = exports.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === r.policyId) ?? null;
    const top = r.posteriors?.[0]?.modelId ?? null;
    // Same defaulting the scorer uses when no policy is found (fail-closed via the null-top guard,
    // but keep the numeric fallbacks in lockstep with scoreV3HDistributionFingerprint's opts ??).
    const minConfidence = policy?.minConfidence ?? 0.9;
    const minLogLikelihoodGap = policy?.minLogLikelihoodGap ?? 0;
    const minProbeVoteMargin = policy?.minProbeVoteMargin ?? 0;
    const minAvgLogLikelihood = policy?.minAvgLogLikelihood ?? -3.5;
    // Shared strong-pass predicate (same source of truth as isFalseAbstain and the scorer).
    const strongPass = !!policy && !!top && isStrongPassByPolicy(policy, r);
    const passes = !!policy &&
        !!top &&
        r.confidence >= minConfidence &&
        r.logLikelihoodGap >= minLogLikelihoodGap &&
        (strongPass || r.probeVoteMargin >= minProbeVoteMargin) &&
        r.avgLogLikelihood >= minAvgLogLikelihood;
    return {
        ...r,
        strongPass,
        abstained: !passes,
        topModel: passes ? top : null,
        runnerUpModel: r.posteriors?.[1]?.modelId ?? r.runnerUpModel ?? null,
    };
}
/** Family prefix = vendor + major model line. Groups deepseek-v4-flash/pro and
 *  gpt-5.5 / gpt-5.3-codex as candidate siblings for tie-breaking. */
function familyKey(modelId) {
    const vendor = modelId.split("/")[0] ?? "";
    const name = (modelId.split("/")[1] ?? modelId).toLowerCase();
    if (name.includes("deepseek-v4"))
        return `${vendor}/deepseek-v4`;
    if (/gpt-5|codex/.test(name))
        return `${vendor}/gpt-5x`;
    return `${vendor}/${name}`;
}
/** Candidate siblings = baselines sharing the model's family key. <2 means V3G is skipped. */
function candidateSiblingsFor(modelId, baselines) {
    const key = familyKey(modelId);
    return baselines.filter((b) => familyKey(b.modelId) === key);
}
/** Candidate siblings by CONFIRMED family (e.g. "deepseek" / "openai") — the vendor
 *  prefix of the baseline modelId. Preferred over candidateSiblingsFor(v4_top) because
 *  the v4 sub-model pick can be a cross-family IKP guess, whereas the family verdict is
 *  what the Chinese-axis override corrects. <2 means V3G is skipped. */
function candidateSiblingsForFamily(family, baselines) {
    // canonicalFamily collapses zhipu⟷z-ai: confirmedFamily is "zhipu" but GLM baseline
    // ids are "z-ai/glm-*" — a raw === would return [] and GLM's V3H would never fire.
    const cf = (0, model_id_normalize_1.canonicalFamily)(family);
    return baselines.filter((b) => (0, model_id_normalize_1.canonicalFamily)(b.modelId.split("/")[0] ?? "") === cf);
}
function candidateSiblingsForConfirmedFamily(family, modelHint, baselines) {
    const sameFamily = candidateSiblingsForFamily(family, baselines);
    if (!modelHint)
        return sameFamily;
    const hinted = candidateSiblingsFor(modelHint, sameFamily);
    return hinted.length >= 2 ? hinted : sameFamily;
}
/** Readable name from a modelId, e.g. "deepseek/deepseek-v4-flash" → "DeepSeek V4 Flash". */
function biasDisplayName(modelId) {
    const raw = modelId.split("/").pop() ?? modelId;
    return raw
        .replace(/^claude-/, "Claude ")
        .replace(/^gpt-/, "GPT-")
        .replace(/^deepseek-/, "DeepSeek ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .replace("Gpt", "GPT");
}
/** Should V3G's confident, family-matched pick FILL the sub-model? Only when the fuse
 *  produced no in-family sub-model (abstained, or a different family) — additive, never
 *  overrides a confident same-family fuse pick, never crosses families. */
function shouldFillSubModelFromV3G(v3g, confirmedFamily, currentTop, minConfidence = 0.9) {
    if (!v3g || v3g.abstained || !v3g.topModel)
        return false;
    if (v3g.confidence < minConfidence)
        return false;
    if (!confirmedFamily || (0, model_id_normalize_1.canonicalFamily)(v3g.topModel.split("/")[0] ?? "") !== (0, model_id_normalize_1.canonicalFamily)(confirmedFamily))
        return false;
    return !currentTop || (0, model_id_normalize_1.canonicalFamily)(currentTop.family ?? "") !== (0, model_id_normalize_1.canonicalFamily)(confirmedFamily); // fuse has no in-family pick
}
function shouldPromoteSubModelFromV3H(v3h, confirmedFamily, currentTop, claimedModelId) {
    if (!v3h || v3h.abstained || !v3h.topModel)
        return false;
    if (!confirmedFamily || (0, model_id_normalize_1.canonicalFamily)(v3h.topModel.split("/")[0] ?? "") !== (0, model_id_normalize_1.canonicalFamily)(confirmedFamily))
        return false;
    // H3 (fail-closed): only promote under a VALIDATED policy. A same-family candidate set
    // with no calibrated policy (e.g. a newly-added 3rd sibling baseline) must NOT promote on
    // the scorer's permissive defaults — abstain rather than fail open.
    const policy = exports.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === v3h.policyId);
    if (!policy) {
        // Fail-closed is correct, but silently so: if a policy is deleted/renamed,
        // V3H stops promoting with zero signal. Make the degradation observable.
        console.warn("[v3h] no calibrated policy — candidate skipped (fail-closed)", {
            policyId: v3h.policyId,
            topModel: v3h.topModel,
        });
        return false;
    }
    // H2: the SAME per-run gates apply to BOTH the fill and the override branch (the fill
    // branch was previously ungated). These three are the real per-run signals. The old
    // `empiricalAccuracyFloor >= 0.9` check was `constant >= constant` (a tautology) and is
    // removed — that field is documented OFFLINE accuracy, not a runtime gate.
    // STRONG PASS waives the vote-margin term here too (mirrors the scorer): a decisive
    // posterior must not be gated out by a vote-margin that is structurally noisy for the
    // 9-model Claude cluster. STANDARD pass keeps the vote-margin requirement.
    const gatesPass = v3h.confidence >= policy.minConfidence &&
        v3h.logLikelihoodGap >= policy.minLogLikelihoodGap &&
        (v3h.strongPass || v3h.probeVoteMargin >= policy.minProbeVoteMargin);
    if (!gatesPass)
        return false;
    // FILL: the fuse produced no in-family sub-model → V3H fills the gap (gates passed above).
    if (!currentTop || (0, model_id_normalize_1.canonicalFamily)(currentTop.family ?? "") !== (0, model_id_normalize_1.canonicalFamily)(confirmedFamily))
        return true;
    if (currentTop.modelId === v3h.topModel)
        return false; // already agree, no change
    // OVERRIDE a DIFFERENT same-family sibling — only when the policy allows it:
    if (!policy.allowSameFamilyOverride)
        return false;
    // AUTHORITATIVE OVERRIDE (strong-pass): a decisive V3H posterior under a validated
    // policy is the most accurate same-family signal we have. When it says a DIFFERENT model
    // than the current fuse pick, it overrides — even if the fuse pick happened to match the
    // claim. That is not a manufactured accusation: it is the real missed-substitution catch
    // (e.g. apicangku: v4=gpt-5.5 matched the claim, V3H=codex 99% → assert codex). We only
    // refuse when there is nothing to change (V3H's own top === the claim AND the fuse already
    // === the claim — handled by the `already agree` return above).
    if (v3h.strongPass)
        return true;
    // H1 (asymmetric cost, STANDARD pass only): NEVER flip a fuse pick that already MATCHES the
    // claim. Overturning a claim-matching pick on a non-decisive posterior manufactures a
    // "已替換" accusation against an honest provider on V3H's high-confidence-wrong tail; that
    // false accusation costs more than missing a rare same-family substitution (this layer is
    // advisory). Confirming-direction overrides (V3H agrees with the claim, fuse picked a
    // different sibling) still pass.
    if (claimedModelId && currentTop.modelId === claimedModelId)
        return false;
    return true;
}
/** Sample each border probe `samples`× via `callModel`, normalize answers, and classify
 *  against the candidate siblings. Returns null when there is no sibling to disambiguate
 *  (candidates < 2). `callModel` returns the raw answer text (or null on failure). */
async function sampleBiasFingerprint(callModel, probes, candidates, opts) {
    if (candidates.length < 2)
        return null;
    // All probes AND their samples run concurrently (≈probes×samples calls at once) so the
    // whole battery is one round-trip deep, not sum-of-probes. Keeps the added audit latency
    // to ~1 slow call (~10-15s) instead of ~70s — which is what pushed sync probes past the
    // Cloudflare ~100s proxy timeout (async is unaffected; it returns a runId immediately).
    const perProbe = await Promise.all(probes.map(async (p) => {
        const raw = await Promise.all(Array.from({ length: p.samples }, () => callModel(p.prompt)));
        const answers = raw.map((a) => (0, sub_model_bias_probes_1.normalizeBiasAnswer)(a)).filter(Boolean);
        return answers.length ? { probeId: p.id, answers } : null;
    }));
    const obs = perProbe.filter((o) => o !== null);
    return scoreBiasFingerprint(obs, candidates, opts);
}
async function sampleV3HDistributionFingerprint(callModel, probes, candidates) {
    if (candidates.length < 2)
        return null;
    const selectedProbes = selectBiasProbesForCandidates(probes, candidates);
    const perProbe = await Promise.all(selectedProbes.map(async (p) => {
        const raw = await Promise.all(Array.from({ length: p.samples }, () => callModel(p.prompt)));
        // Faithful to the baseline builder (scripts/build-bias-baselines.ts): a FAILED call
        // (null) is skipped, but a RETURNED-BUT-EMPTY answer normalizes to the "(blank)" signal
        // token and IS kept — it is a real observation (the fable-5 empty-refusal fingerprint),
        // scored against the baseline's own "(blank)" mass. Do NOT .filter(Boolean) it away, or
        // the scored obs and the persisted obs would both silently drop that signal.
        const answers = raw
            .filter((a) => a !== null)
            .map((a) => (0, sub_model_bias_probes_1.normalizeBiasAnswer)(a) || "(blank)");
        return answers.length ? { probeId: p.id, answers } : null;
    }));
    const observations = perProbe.filter((o) => o !== null);
    const result = scoreV3HDistributionFingerprint(observations, candidates);
    return { result, observations };
}
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.js.map
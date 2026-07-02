"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3H_ACTIVE_PROMPT_POLICIES = void 0;
exports.filterFreshBiasBaselines = filterFreshBiasBaselines;
exports.scoreBiasFingerprint = scoreBiasFingerprint;
exports.policyForCandidates = policyForCandidates;
exports.selectBiasProbesForCandidates = selectBiasProbesForCandidates;
exports.scoreV3HDistributionFingerprint = scoreV3HDistributionFingerprint;
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
const sub_model_bias_probes_js_1 = require("./sub-model-bias-probes.js");
/** H5: fail-closed freshness gate. Distributions drift as vendors retrain; a stale or
 *  thin baseline silently rots into drift-induced false 已替換. Default: 180 days / 100. */
function filterFreshBiasBaselines(baselines, opts) {
    const now = opts?.now ?? Date.now();
    const maxAgeMs = (opts?.maxAgeDays ?? 180) * 24 * 60 * 60 * 1000;
    const minSampleCount = opts?.minSampleCount ?? 100;
    const fresh = [];
    const dropped = [];
    for (const b of baselines) {
        const captured = b.capturedAt ? Date.parse(b.capturedAt) : NaN;
        if (!b.capturedAt || !Number.isFinite(captured) || typeof b.sampleCount !== "number") {
            dropped.push({ modelId: b.modelId, reason: "missing-metadata" });
        }
        else if (now - captured > maxAgeMs) {
            dropped.push({ modelId: b.modelId, reason: "stale" });
        }
        else if (b.sampleCount < minSampleCount) {
            dropped.push({ modelId: b.modelId, reason: "thin-sample" });
        }
        else {
            fresh.push(b);
        }
    }
    return { fresh, dropped };
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
    },
    {
        id: "anthropic-claude-cluster",
        modelIds: [
            "anthropic/claude-opus-4.5", "anthropic/claude-opus-4.6", "anthropic/claude-opus-4.7",
            "anthropic/claude-opus-4.8", "anthropic/claude-sonnet-4.5", "anthropic/claude-sonnet-4.6",
            "anthropic/claude-sonnet-5", "anthropic/claude-haiku-4.5", "anthropic/claude-fable-5",
        ],
        // All 7 border probes: the full set gave the best gated result (95.5% correct, 0% wrong);
        // dropping day/1to100 lowered min recall (they still add aggregate signal for the gates).
        activeProbeIds: ["rand_country", "rand_1to100", "rand_animal", "rand_color", "rand_letter", "day", "zero_natural"],
        minConfidence: 0.85,
        minLogLikelihoodGap: 1.5,
        minProbeVoteMargin: 1,
        empiricalAccuracyFloor: 0.955, // documented offline 9-way gated accuracy (0% wrong); DIAGNOSTIC ONLY
        allowSameFamilyOverride: true,
        minAvgLogLikelihood: -3.8,
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
    const passes = !!top &&
        base.confidence >= minConfidence &&
        logLikelihoodGap >= minLogLikelihoodGap &&
        probeVoteMargin >= minProbeVoteMargin &&
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
    return baselines.filter((b) => (b.modelId.split("/")[0] ?? "") === family);
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
    if (!confirmedFamily || (v3g.topModel.split("/")[0] ?? "") !== confirmedFamily)
        return false;
    return !currentTop || currentTop.family !== confirmedFamily; // fuse has no in-family pick
}
function shouldPromoteSubModelFromV3H(v3h, confirmedFamily, currentTop, claimedModelId) {
    if (!v3h || v3h.abstained || !v3h.topModel)
        return false;
    if (!confirmedFamily || (v3h.topModel.split("/")[0] ?? "") !== confirmedFamily)
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
    const gatesPass = v3h.confidence >= policy.minConfidence &&
        v3h.logLikelihoodGap >= policy.minLogLikelihoodGap &&
        v3h.probeVoteMargin >= policy.minProbeVoteMargin;
    if (!gatesPass)
        return false;
    // FILL: the fuse produced no in-family sub-model → V3H fills the gap (gates passed above).
    if (!currentTop || currentTop.family !== confirmedFamily)
        return true;
    if (currentTop.modelId === v3h.topModel)
        return false; // already agree, no change
    // OVERRIDE a DIFFERENT same-family sibling — only when the policy allows it:
    if (!policy.allowSameFamilyOverride)
        return false;
    // H1 (asymmetric cost): NEVER flip a fuse pick that already MATCHES the claim. Overturning
    // a claim-matching pick manufactures a "已替換" accusation against an honest provider on
    // V3H's ~1-2% high-confidence-wrong tail; that false accusation costs more than missing a
    // rare same-family substitution (this layer is advisory). Confirming-direction overrides
    // (V3H agrees with the claim, fuse picked a different sibling) still pass.
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
        const answers = raw.map((a) => (0, sub_model_bias_probes_js_1.normalizeBiasAnswer)(a)).filter(Boolean);
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
        const answers = raw.map((a) => (0, sub_model_bias_probes_js_1.normalizeBiasAnswer)(a)).filter(Boolean);
        return answers.length ? { probeId: p.id, answers } : null;
    }));
    const obs = perProbe.filter((o) => o !== null);
    return scoreV3HDistributionFingerprint(obs, candidates);
}
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.js.map
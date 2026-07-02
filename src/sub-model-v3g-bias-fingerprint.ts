// lib/sub-model/v3g-bias-fingerprint.ts
// Pure classifier for the V3G bias-fingerprint layer. Given a set of border-probe
// observations (each = the N sampled answers for one probe) and ≥2 candidate sibling
// baselines, score each candidate by summed Laplace-smoothed log-likelihood and return
// the softmax posterior. Abstains on too-few-candidates / empty obs / low confidence, so
// it never forces a call on a weak signal.
import { normalizeBiasAnswer, type BiasProbe } from "./sub-model-bias-probes.js";
export interface BiasBaseline {
  modelId: string;
  /** H5 freshness metadata. Baselines WITHOUT metadata are excluded from V3H at runtime
   *  (fail-closed) — an unstamped distribution cannot prove it isn't rotted. */
  capturedAt?: string; // ISO date the raws were sampled
  sampleCount?: number; // total normalized answers across all probes
  /** probeId -> (normalized answer -> count) */
  probes: Record<string, Record<string, number>>;
}

export interface BaselineFreshnessOpts {
  now?: number;
  maxAgeDays?: number;
  minSampleCount?: number;
}

/** H5: fail-closed freshness gate. Distributions drift as vendors retrain; a stale or
 *  thin baseline silently rots into drift-induced false 已替換. Default: 180 days / 100. */
export function filterFreshBiasBaselines(
  baselines: BiasBaseline[],
  opts?: BaselineFreshnessOpts,
): { fresh: BiasBaseline[]; dropped: Array<{ modelId: string; reason: "missing-metadata" | "stale" | "thin-sample" }> } {
  const now = opts?.now ?? Date.now();
  const maxAgeMs = (opts?.maxAgeDays ?? 180) * 24 * 60 * 60 * 1000;
  const minSampleCount = opts?.minSampleCount ?? 100;
  const fresh: BiasBaseline[] = [];
  const dropped: Array<{ modelId: string; reason: "missing-metadata" | "stale" | "thin-sample" }> = [];
  for (const b of baselines) {
    const captured = b.capturedAt ? Date.parse(b.capturedAt) : NaN;
    if (!b.capturedAt || !Number.isFinite(captured) || typeof b.sampleCount !== "number") {
      dropped.push({ modelId: b.modelId, reason: "missing-metadata" });
    } else if (now - captured > maxAgeMs) {
      dropped.push({ modelId: b.modelId, reason: "stale" });
    } else if (b.sampleCount < minSampleCount) {
      dropped.push({ modelId: b.modelId, reason: "thin-sample" });
    } else {
      fresh.push(b);
    }
  }
  return { fresh, dropped };
}
export interface BiasObservation {
  probeId: string;
  answers: string[]; // normalized
}
export interface V3GResult {
  topModel: string | null;
  confidence: number; // max softmax posterior (0..1)
  scores: Record<string, number>; // modelId -> summed log-likelihood
  perProbe: Array<{ probeId: string; topModel: string | null }>;
  abstained: boolean;
}

export interface V3HPolicy {
  id: string;
  modelIds: string[];
  activeProbeIds: string[];
  minConfidence: number;
  minLogLikelihoodGap: number;
  minProbeVoteMargin: number;
  /** DOCUMENTED offline held-out accuracy for this pair (from validate-v3h-targets.mts).
   *  DIAGNOSTIC ONLY — it is NOT a runtime gate. The real per-run gates are minConfidence
   *  / minLogLikelihoodGap / minProbeVoteMargin. (Threading a measured per-run bound here is
   *  a follow-up; see the V3H plan.) */
  empiricalAccuracyFloor: number;
  allowSameFamilyOverride: boolean;
  /** H4: absolute goodness-of-fit floor. topScore/sampleCount (avg per-answer log-likelihood
   *  of the winning candidate) must be >= this, else abstain. Guards against the softmax
   *  confidently ranking two candidates that BOTH fit terribly (wrong confirmedFamily /
   *  out-of-family imposter: all-unseen answers average ≈ log(1/(n+60)) ≈ -4.6). */
  minAvgLogLikelihood: number;
}

export interface V3HResult extends V3GResult {
  version: "v3h";
  policyId: string | null;
  activeProbeIds: string[];
  sampleCount: number;
  runnerUpModel: string | null;
  logLikelihoodGap: number;
  probeVoteMargin: number;
  posteriors: Array<{ modelId: string; score: number }>;
  empiricalAccuracyFloor: number | null;
  /** topScore / sampleCount; -Infinity when no samples. H4 diagnostic + gate input. */
  avgLogLikelihood: number;
}

export const V3H_ACTIVE_PROMPT_POLICIES: V3HPolicy[] = [
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

function logLik(answers: string[], dist: Record<string, number> | undefined): number {
  const d = dist ?? {};
  const n = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  let s = 0;
  for (const a of answers) s += Math.log(((d[a] || 0) + 1) / (n + SMOOTH_DENOM));
  return s;
}

export function scoreBiasFingerprint(
  obs: BiasObservation[],
  candidates: BiasBaseline[],
  opts?: { minConfidence?: number },
): V3GResult {
  const minConfidence = opts?.minConfidence ?? 0.9;
  const empty: V3GResult = { topModel: null, confidence: 0, scores: {}, perProbe: [], abstained: true };
  const usableObs = obs.filter((o) => o.answers.length > 0);
  if (candidates.length < 2 || usableObs.length === 0) return empty;

  const scores: Record<string, number> = {};
  for (const c of candidates) scores[c.modelId] = 0;
  const perProbe: V3GResult["perProbe"] = [];
  for (const o of usableObs) {
    let best: string | null = null, bestLL = -Infinity;
    for (const c of candidates) {
      const ll = logLik(o.answers, c.probes[o.probeId]);
      scores[c.modelId] += ll;
      if (ll > bestLL) { bestLL = ll; best = c.modelId; }
    }
    perProbe.push({ probeId: o.probeId, topModel: best });
  }

  // softmax posterior over summed log-likelihoods
  const entries = Object.entries(scores);
  const maxS = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([m, v]) => [m, Math.exp(v - maxS)] as const);
  const Z = exps.reduce((a, [, e]) => a + e, 0) || 1;
  const posteriors = exps.map(([m, e]) => [m, e / Z] as const).sort((a, b) => b[1] - a[1]);
  const [topModel, confidence] = posteriors[0];

  if (confidence < minConfidence) return { topModel: null, confidence, scores, perProbe, abstained: true };
  return { topModel, confidence, scores, perProbe, abstained: false };
}

function sortedModelIds(items: Array<{ modelId: string }>): string[] {
  return items.map((x) => x.modelId).sort();
}

function sameModelSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  return as.every((v, i) => v === bs[i]);
}

export function policyForCandidates(candidates: BiasBaseline[]): V3HPolicy | null {
  const ids = sortedModelIds(candidates);
  return V3H_ACTIVE_PROMPT_POLICIES.find((p) => sameModelSet(p.modelIds, ids)) ?? null;
}

export function selectBiasProbesForCandidates(
  probes: BiasProbe[],
  candidates: BiasBaseline[],
): BiasProbe[] {
  const policy = policyForCandidates(candidates);
  if (!policy) return probes;
  const byId = new Map(probes.map((p) => [p.id, p]));
  const selected = policy.activeProbeIds.map((id) => byId.get(id)).filter((p): p is BiasProbe => !!p);
  return selected.length > 0 ? selected : probes;
}

function posteriorFromScores(scores: Record<string, number>): Array<{ modelId: string; score: number }> {
  const entries = Object.entries(scores);
  if (entries.length === 0) return [];
  const maxS = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([modelId, v]) => ({ modelId, e: Math.exp(v - maxS) }));
  const z = exps.reduce((a, x) => a + x.e, 0) || 1;
  return exps
    .map((x) => ({ modelId: x.modelId, score: x.e / z }))
    .sort((a, b) => b.score - a.score);
}

function voteMargin(perProbe: V3GResult["perProbe"], topModel: string | null): number {
  if (!topModel) return 0;
  const counts: Record<string, number> = {};
  for (const p of perProbe) if (p.topModel) counts[p.topModel] = (counts[p.topModel] ?? 0) + 1;
  const top = counts[topModel] ?? 0;
  const runner = Math.max(0, ...Object.entries(counts).filter(([m]) => m !== topModel).map(([, c]) => c));
  return top - runner;
}

export function scoreV3HDistributionFingerprint(
  obs: BiasObservation[],
  candidates: BiasBaseline[],
  opts?: {
    minConfidence?: number;
    minLogLikelihoodGap?: number;
    minProbeVoteMargin?: number;
    minAvgLogLikelihood?: number;
  },
): V3HResult {
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
  const passes =
    !!top &&
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
function familyKey(modelId: string): string {
  const vendor = modelId.split("/")[0] ?? "";
  const name = (modelId.split("/")[1] ?? modelId).toLowerCase();
  if (name.includes("deepseek-v4")) return `${vendor}/deepseek-v4`;
  if (/gpt-5|codex/.test(name)) return `${vendor}/gpt-5x`;
  return `${vendor}/${name}`;
}

/** Candidate siblings = baselines sharing the model's family key. <2 means V3G is skipped. */
export function candidateSiblingsFor(modelId: string, baselines: BiasBaseline[]): BiasBaseline[] {
  const key = familyKey(modelId);
  return baselines.filter((b) => familyKey(b.modelId) === key);
}

/** Candidate siblings by CONFIRMED family (e.g. "deepseek" / "openai") — the vendor
 *  prefix of the baseline modelId. Preferred over candidateSiblingsFor(v4_top) because
 *  the v4 sub-model pick can be a cross-family IKP guess, whereas the family verdict is
 *  what the Chinese-axis override corrects. <2 means V3G is skipped. */
export function candidateSiblingsForFamily(family: string, baselines: BiasBaseline[]): BiasBaseline[] {
  return baselines.filter((b) => (b.modelId.split("/")[0] ?? "") === family);
}

export function candidateSiblingsForConfirmedFamily(
  family: string,
  modelHint: string | null | undefined,
  baselines: BiasBaseline[],
): BiasBaseline[] {
  const sameFamily = candidateSiblingsForFamily(family, baselines);
  if (!modelHint) return sameFamily;
  const hinted = candidateSiblingsFor(modelHint, sameFamily);
  return hinted.length >= 2 ? hinted : sameFamily;
}

/** Readable name from a modelId, e.g. "deepseek/deepseek-v4-flash" → "DeepSeek V4 Flash". */
export function biasDisplayName(modelId: string): string {
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
export function shouldFillSubModelFromV3G(
  v3g: V3GResult | null | undefined,
  confirmedFamily: string | undefined,
  currentTop: { family?: string | null } | null | undefined,
  minConfidence = 0.9,
): boolean {
  if (!v3g || v3g.abstained || !v3g.topModel) return false;
  if (v3g.confidence < minConfidence) return false;
  if (!confirmedFamily || (v3g.topModel.split("/")[0] ?? "") !== confirmedFamily) return false;
  return !currentTop || currentTop.family !== confirmedFamily; // fuse has no in-family pick
}

export function shouldPromoteSubModelFromV3H(
  v3h: V3HResult | null | undefined,
  confirmedFamily: string | undefined,
  currentTop: { modelId?: string | null; family?: string | null } | null | undefined,
  claimedModelId?: string | null,
): boolean {
  if (!v3h || v3h.abstained || !v3h.topModel) return false;
  if (!confirmedFamily || (v3h.topModel.split("/")[0] ?? "") !== confirmedFamily) return false;
  // H3 (fail-closed): only promote under a VALIDATED policy. A same-family candidate set
  // with no calibrated policy (e.g. a newly-added 3rd sibling baseline) must NOT promote on
  // the scorer's permissive defaults — abstain rather than fail open.
  const policy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === v3h.policyId);
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
  const gatesPass =
    v3h.confidence >= policy.minConfidence &&
    v3h.logLikelihoodGap >= policy.minLogLikelihoodGap &&
    v3h.probeVoteMargin >= policy.minProbeVoteMargin;
  if (!gatesPass) return false;
  // FILL: the fuse produced no in-family sub-model → V3H fills the gap (gates passed above).
  if (!currentTop || currentTop.family !== confirmedFamily) return true;
  if (currentTop.modelId === v3h.topModel) return false; // already agree, no change
  // OVERRIDE a DIFFERENT same-family sibling — only when the policy allows it:
  if (!policy.allowSameFamilyOverride) return false;
  // H1 (asymmetric cost): NEVER flip a fuse pick that already MATCHES the claim. Overturning
  // a claim-matching pick manufactures a "已替換" accusation against an honest provider on
  // V3H's ~1-2% high-confidence-wrong tail; that false accusation costs more than missing a
  // rare same-family substitution (this layer is advisory). Confirming-direction overrides
  // (V3H agrees with the claim, fuse picked a different sibling) still pass.
  if (claimedModelId && currentTop.modelId === claimedModelId) return false;
  return true;
}

/** Sample each border probe `samples`× via `callModel`, normalize answers, and classify
 *  against the candidate siblings. Returns null when there is no sibling to disambiguate
 *  (candidates < 2). `callModel` returns the raw answer text (or null on failure). */
export async function sampleBiasFingerprint(
  callModel: (prompt: string) => Promise<string | null>,
  probes: BiasProbe[],
  candidates: BiasBaseline[],
  opts?: { minConfidence?: number },
): Promise<V3GResult | null> {
  if (candidates.length < 2) return null;
  // All probes AND their samples run concurrently (≈probes×samples calls at once) so the
  // whole battery is one round-trip deep, not sum-of-probes. Keeps the added audit latency
  // to ~1 slow call (~10-15s) instead of ~70s — which is what pushed sync probes past the
  // Cloudflare ~100s proxy timeout (async is unaffected; it returns a runId immediately).
  const perProbe = await Promise.all(probes.map(async (p) => {
    const raw = await Promise.all(Array.from({ length: p.samples }, () => callModel(p.prompt)));
    const answers = raw.map((a) => normalizeBiasAnswer(a)).filter(Boolean);
    return answers.length ? { probeId: p.id, answers } : null;
  }));
  const obs = perProbe.filter((o): o is BiasObservation => o !== null);
  return scoreBiasFingerprint(obs, candidates, opts);
}

export async function sampleV3HDistributionFingerprint(
  callModel: (prompt: string) => Promise<string | null>,
  probes: BiasProbe[],
  candidates: BiasBaseline[],
): Promise<V3HResult | null> {
  if (candidates.length < 2) return null;
  const selectedProbes = selectBiasProbesForCandidates(probes, candidates);
  const perProbe = await Promise.all(selectedProbes.map(async (p) => {
    const raw = await Promise.all(Array.from({ length: p.samples }, () => callModel(p.prompt)));
    const answers = raw.map((a) => normalizeBiasAnswer(a)).filter(Boolean);
    return answers.length ? { probeId: p.id, answers } : null;
  }));
  const obs = perProbe.filter((o): o is BiasObservation => o !== null);
  return scoreV3HDistributionFingerprint(obs, candidates);
}

import { type BiasProbe } from "./sub-model-bias-probes";
export interface BiasBaseline {
    modelId: string;
    /** H5 freshness metadata. Baselines WITHOUT metadata are excluded from V3H at runtime
     *  (fail-closed) — an unstamped distribution cannot prove it isn't rotted. */
    capturedAt?: string;
    sampleCount?: number;
    /** probeId -> (normalized answer -> count) */
    probes: Record<string, Record<string, number>>;
}
export interface BaselineFreshnessOpts {
    now?: number;
    maxAgeDays?: number;
    minSampleCount?: number;
}
/** One expired-but-valid baseline: the FULL baseline object (so the runtime can still USE it
 *  at full authority — Task 9a) plus how many days past the maxAge line it is (for telemetry
 *  and operator notification). `modelId` is duplicated at the top level for cheap logging. */
export interface ExpiredBiasBaseline {
    modelId: string;
    expiredDays: number;
    baseline: BiasBaseline;
}
/** H5 freshness partition. Distributions drift as vendors retrain, so age matters — but a
 *  drifted baseline is still the best signal we have and MUST NOT silently disappear
 *  (Task 9a: a hard drop around 2026-12-29 would kill V3H everywhere). So:
 *  - `fresh`   — valid metadata, within maxAge, well-sampled → primary candidates.
 *  - `expired` — valid metadata, OLDER than maxAge → STILL USABLE with full authority; the
 *                caller uses `[...fresh, ...expired]` and only FLAGS the run as running on
 *                stale data (so the operator can refresh — wiring is a separate task).
 *  - `dropped` — `missing-metadata` / `thin-sample` → fail-closed, NOT usable (an unstamped
 *                or thin distribution cannot prove it isn't rotted). Default: 180 days / 100. */
export declare function filterFreshBiasBaselines(baselines: BiasBaseline[], opts?: BaselineFreshnessOpts): {
    fresh: BiasBaseline[];
    expired: ExpiredBiasBaseline[];
    dropped: Array<{
        modelId: string;
        reason: "missing-metadata" | "thin-sample";
    }>;
};
export interface BiasObservation {
    probeId: string;
    answers: string[];
}
export interface V3GResult {
    topModel: string | null;
    confidence: number;
    scores: Record<string, number>;
    perProbe: Array<{
        probeId: string;
        topModel: string | null;
    }>;
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
    /** H6: minimum sample count before a STRICTLY-NEGATIVE per-probe vote-margin may be WAIVED by
     *  strong-pass. A strictly-negative vote-margin (per-probe votes actually favor the runner-up)
     *  is MEANINGFUL real disagreement at low sample counts — the signature of a starved residue
     *  (≈1 sample/probe) that fits a SIBLING marginally better and looks decisive while being noise
     *  (2026-07-03 false-substitution: opus-4.5 @7 samples, vote -1 → opus-4.6, conf 0.957). But at
     *  HIGH sample counts a strictly-negative margin is just cluster-scatter (the 9-model Claude
     *  cluster's single-winner-per-probe margin is routinely ≤0 even on a 100% posterior). So the
     *  waiver only applies to a strictly-negative margin once samples reach this floor. A vote-margin
     *  of >= 0 is always waivable regardless of sample count. Default 2× the active-probe count
     *  ("≥2 samples/probe before a negative margin can be waived"). */
    minStrongPassSampleCount: number;
}
export interface V3HResult extends V3GResult {
    version: "v3h";
    policyId: string | null;
    activeProbeIds: string[];
    sampleCount: number;
    runnerUpModel: string | null;
    logLikelihoodGap: number;
    probeVoteMargin: number;
    posteriors: Array<{
        modelId: string;
        score: number;
    }>;
    empiricalAccuracyFloor: number | null;
    /** topScore / sampleCount; -Infinity when no samples. H4 diagnostic + gate input. */
    avgLogLikelihood: number;
    /** STRONG PASS: a decisive posterior under a VALIDATED policy —
     *  confidence >= 0.95 AND logLikelihoodGap >= 2× the policy min AND
     *  avgLogLikelihood >= the policy floor. When true, the per-probe
     *  `probeVoteMargin` gate is WAIVED (it is noise for the 9-model Claude
     *  cluster where the single-winner-per-probe margin is routinely ≤0 even
     *  when the summed log-likelihood posterior is 100%), and downstream
     *  promotion may OVERRIDE a contradictory same-family V4 pick, not just
     *  fill on abstain. All other floors (confidence / gap / avgLL) still hold. */
    strongPass: boolean;
    /** TELEMETRY ONLY (Task 9a): the modelIds among the SCORED candidates whose baseline was
     *  EXPIRED (older than maxAge but still full-authority). Populated by the route from the
     *  freshness partition; the scorer defaults it to []. This field records that the decision
     *  ran on stale data so the operator can be notified to refresh — it MUST NOT gate anything
     *  (an expired-only decisive candidate set still strong-passes and promotes identically to
     *  a fresh one). Do NOT read it in any pass/abstain/override predicate. */
    usedExpiredBaselines: string[];
}
export declare const V3H_ACTIVE_PROMPT_POLICIES: V3HPolicy[];
export declare function scoreBiasFingerprint(obs: BiasObservation[], candidates: BiasBaseline[], opts?: {
    minConfidence?: number;
}): V3GResult;
export declare function policyForCandidates(candidates: BiasBaseline[]): V3HPolicy | null;
/** True when some active V3H border policy covers BOTH model ids — i.e. the
 *  claimed↔detected sibling pair is one we can actually separate at the border.
 *  Used by the verdict to decide whether a confident-but-lone V3 "different
 *  sibling" call is trustworthy enough to assert a substitution (已替換). For
 *  clusters with no policy (GLM/qwen/gemini/…) this returns false and the
 *  verdict stays family_only. Ids are normalized (dash/dot, org prefix). */
export declare function hasV3HSeparator(a: string, b: string): boolean;
export declare function selectBiasProbesForCandidates(probes: BiasProbe[], candidates: BiasBaseline[]): BiasProbe[];
export declare function scoreV3HDistributionFingerprint(obs: BiasObservation[], candidates: BiasBaseline[], opts?: {
    minConfidence?: number;
    minLogLikelihoodGap?: number;
    minProbeVoteMargin?: number;
    minAvgLogLikelihood?: number;
}): V3HResult;
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
export declare function isStrongPassByPolicy(policy: V3HPolicy, r: Pick<V3HResult, "confidence" | "logLikelihoodGap" | "avgLogLikelihood" | "probeVoteMargin" | "sampleCount">): boolean;
/** The raw log-likelihood-gap a result must clear to strong-pass under `policyId` —
 *  i.e. `2 × policy.minLogLikelihoodGap` (the exact bound in isStrongPassByPolicy).
 *  Returned to DISPLAY surfaces so an unconfirmed sub-model can honestly show
 *  "指紋差距 {gap} < {requiredGap}" instead of a softmax % that reads as certainty.
 *  Null when the policyId is unknown (no bound to cite). */
export declare function requiredStrongPassGap(policyId: string | null | undefined): number | null;
/** A result that abstained even though its posterior was DECISIVE by the strong-pass
 *  criteria of its own validated policy. Counted as a FAILURE — an over-conservative
 *  gate silences the most accurate signal (2026-07-03 incident: 15 runs). Uses the shared
 *  `isStrongPassByPolicy` predicate, so its thresholds cannot drift from the scorer's. */
export declare function isFalseAbstain(r: V3HResult): boolean;
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
export declare function regateV3HResult(r: V3HResult): V3HResult;
/** Candidate siblings = baselines sharing the model's family key. <2 means V3G is skipped. */
export declare function candidateSiblingsFor(modelId: string, baselines: BiasBaseline[]): BiasBaseline[];
/** Candidate siblings by CONFIRMED family (e.g. "deepseek" / "openai") — the vendor
 *  prefix of the baseline modelId. Preferred over candidateSiblingsFor(v4_top) because
 *  the v4 sub-model pick can be a cross-family IKP guess, whereas the family verdict is
 *  what the Chinese-axis override corrects. <2 means V3G is skipped. */
export declare function candidateSiblingsForFamily(family: string, baselines: BiasBaseline[]): BiasBaseline[];
export declare function candidateSiblingsForConfirmedFamily(family: string, modelHint: string | null | undefined, baselines: BiasBaseline[]): BiasBaseline[];
/** Readable name from a modelId, e.g. "deepseek/deepseek-v4-flash" → "DeepSeek V4 Flash". */
export declare function biasDisplayName(modelId: string): string;
/** Should V3G's confident, family-matched pick FILL the sub-model? Only when the fuse
 *  produced no in-family sub-model (abstained, or a different family) — additive, never
 *  overrides a confident same-family fuse pick, never crosses families. */
export declare function shouldFillSubModelFromV3G(v3g: V3GResult | null | undefined, confirmedFamily: string | undefined, currentTop: {
    family?: string | null;
} | null | undefined, minConfidence?: number): boolean;
export declare function shouldPromoteSubModelFromV3H(v3h: V3HResult | null | undefined, confirmedFamily: string | undefined, currentTop: {
    modelId?: string | null;
    family?: string | null;
} | null | undefined, claimedModelId?: string | null): boolean;
/** Sample each border probe `samples`× via `callModel`, normalize answers, and classify
 *  against the candidate siblings. Returns null when there is no sibling to disambiguate
 *  (candidates < 2). `callModel` returns the raw answer text (or null on failure). */
export declare function sampleBiasFingerprint(callModel: (prompt: string) => Promise<string | null>, probes: BiasProbe[], candidates: BiasBaseline[], opts?: {
    minConfidence?: number;
}): Promise<V3GResult | null>;
/** The V3H sampler's full output: the scored result PLUS the normalized per-probe
 *  observations it was scored from. The observations are compact telemetry (~7 probes ×
 *  up to 3 answers) persisted by the route so a future incident is fully SCORER-replayable
 *  — a stored V3HResult only carries aggregates, but `observations` are the actual inputs,
 *  so `scoreV3HDistributionFingerprint(observations, candidates)` reproduces the same
 *  decision. `null` (returned when there is no sibling to disambiguate) has no observations. */
export interface V3HSampleResult {
    result: V3HResult;
    observations: BiasObservation[];
}
export declare function sampleV3HDistributionFingerprint(callModel: (prompt: string) => Promise<string | null>, probes: BiasProbe[], candidates: BiasBaseline[]): Promise<V3HSampleResult | null>;
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.d.ts.map
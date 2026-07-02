import { type BiasProbe } from "./sub-model-bias-probes.js";
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
/** H5: fail-closed freshness gate. Distributions drift as vendors retrain; a stale or
 *  thin baseline silently rots into drift-induced false 已替換. Default: 180 days / 100. */
export declare function filterFreshBiasBaselines(baselines: BiasBaseline[], opts?: BaselineFreshnessOpts): {
    fresh: BiasBaseline[];
    dropped: Array<{
        modelId: string;
        reason: "missing-metadata" | "stale" | "thin-sample";
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
}
export declare const V3H_ACTIVE_PROMPT_POLICIES: V3HPolicy[];
export declare function scoreBiasFingerprint(obs: BiasObservation[], candidates: BiasBaseline[], opts?: {
    minConfidence?: number;
}): V3GResult;
export declare function policyForCandidates(candidates: BiasBaseline[]): V3HPolicy | null;
export declare function selectBiasProbesForCandidates(probes: BiasProbe[], candidates: BiasBaseline[]): BiasProbe[];
export declare function scoreV3HDistributionFingerprint(obs: BiasObservation[], candidates: BiasBaseline[], opts?: {
    minConfidence?: number;
    minLogLikelihoodGap?: number;
    minProbeVoteMargin?: number;
    minAvgLogLikelihood?: number;
}): V3HResult;
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
export declare function sampleV3HDistributionFingerprint(callModel: (prompt: string) => Promise<string | null>, probes: BiasProbe[], candidates: BiasBaseline[]): Promise<V3HResult | null>;
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.d.ts.map
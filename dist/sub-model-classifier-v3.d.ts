import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import { V3_BASELINES, getAllFamilies } from "./sub-model-baselines-v3.js";
import { type V3EFamilyVote } from "./sub-model-classifier-v3e.js";
export interface V3Features {
    cutoff: string | null;
    capability: {
        q1_strawberry: string | null;
        q2_1000days: string | null;
        q3_apples: string | null;
        q4_prime: string | null;
        q5_backwards: string | null;
    };
    refusal: {
        lead: string;
        starts_with_no: boolean;
        starts_with_sorry: boolean;
        starts_with_cant: boolean;
        cites_18_usc: boolean;
        mentions_988: boolean;
        mentions_virtually_all: boolean;
        mentions_history_alt: boolean;
        mentions_pyrotechnics: boolean;
        mentions_policies: boolean;
        mentions_guidelines: boolean;
        mentions_illegal: boolean;
        mentions_harmful: boolean;
        length: number;
    };
    /** null = not observed (no signal); true = model rejected temperature (HTTP 400);
     *  false = temperature was accepted — unreliable via gateways, treated as null. */
    rejectsTemperature: boolean | null;
}
export interface V3Match {
    modelId: string;
    family: string;
    displayName: string;
    score: number;
    matchedFeatures: string[];
    divergentFeatures: string[];
}
/** Score gap below which the scorer abstains. Tuned from baseline analysis —
 * Opus 4.5 / 4.7 can tie within 2-3% due to shared capability + refusal lead
 * prefix. 5% is generous enough to catch these cases without suppressing
 * legitimate-but-close winners. */
export declare const TIE_BREAK_GAP = 0.05;
export interface V3Output {
    features: V3Features;
    /** Best sub-model match (family-scoped if predictedFamily given, else cross-family).
     * null when: (a) no candidates available, or (b) top-2 gap < TIE_BREAK_GAP (abstained). */
    top: V3Match | null;
    /** Top-3 candidates with scores — preserved even when abstained so UI can
     * show "closest candidates". Sorted by score descending. */
    candidates: V3Match[];
    /** V3-implied family derived from feature signatures (independent of V2) */
    familyImplied: string | null;
    /** true iff familyImplied !== predictedFamily and predictedFamily given */
    familyMismatch: boolean;
    /** true when top-2 gap < TIE_BREAK_GAP — scorer cannot confidently pick one.
     * UI should show "子模型無法區分". `top` is null when this is true. */
    abstained: boolean;
}
export interface FamilyVoteResult {
    family: string | null;
    votes: Record<string, number>;
    score: number;
    gap: number;
    reasons: string[];
}
export declare function extractCutoff(text: string): string | null;
export declare function extractCapability(text: string): V3Features["capability"];
/** Join the two boundary probes into one text whose FIRST LINE carries both leads.
 *
 *  `extractRefusal` only keeps the first 40 chars as `lead`, so the two openers are
 *  folded onto a single line separated by "¦". A model that shares an opener with
 *  a sibling on one probe almost never shares it on both, which is exactly the
 *  collision that capped the single-prompt replacement at 52.4% (see
 *  docs/reports/2026-08-10-v3-benign-probe-tradeoff.md).
 *
 *  Missing second probe (older rows, identity-only runs) degrades gracefully to the
 *  first probe alone — same behaviour as before this change. */
export declare function compositeBoundaryText(responses: Record<string, string>): string;
export declare function extractRefusal(text: string): V3Features["refusal"];
export declare function extractV3Features(responses: Record<string, string>, rejectsTemperature?: boolean | null): V3Features;
/** Log-Gaussian length-similarity kernel.
 * Score decays smoothly with |log(obs/ref)|. Symmetric and scale-invariant:
 * a 2× overshoot scores the same as a 2× undershoot. sigma=0.5 → 20% drift ≈
 * 0.94, 2× drift ≈ 0.38 (tuned so Opus 4.5 ref=457 and Opus 4.7 ref=1023
 * clearly separate under a 700-char observation). */
export declare function lengthScoreLogGaussian(obs: number, ref: number): number;
export declare function implyFamilyV2A(features: V3Features): string | null;
export declare function implyFamilyV2BWithVotes(features: V3Features, baselines?: SubmodelBaselineV3[], extraVotes?: V3EFamilyVote[]): FamilyVoteResult;
export declare function implyFamilyV2B(features: V3Features): string | null;
export declare function implyFamily(features: V3Features): string | null;
export declare function classifySubmodelV3(responses: Record<string, string>, options?: {
    predictedFamily?: string;
    confidenceThreshold?: number;
    rejectsTemperature?: boolean | null;
}): V3Output;
/** Re-score a previously-extracted V3Features vector (e.g. from probe_history
 * JSON) against the current baselines. Used by scripts/v3-scorer-replay.mts
 * to compare old-scorer vs new-scorer results without re-calling upstream. */
export declare function scoreExtractedFeatures(features: V3Features): V3Output;
export declare function verifyPairwiseUniqueness(): {
    unique: boolean;
    collisions: Array<[string, string]>;
};
export { V3_BASELINES, getAllFamilies };
//# sourceMappingURL=sub-model-classifier-v3.d.ts.map
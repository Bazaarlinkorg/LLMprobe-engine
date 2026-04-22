import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import { V3_BASELINES, getBaselinesForFamily, getAllFamilies } from "./sub-model-baselines-v3.js";
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
/** Score gap below which the scorer abstains. Opus 4.5 / 4.7 can tie within
 * 2-3% due to shared capability + refusal lead prefix. 5% is generous enough
 * to catch these cases without suppressing legitimate-but-close winners. */
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
     * `top` is null when this is true. */
    abstained: boolean;
}
export declare function extractCutoff(text: string): string | null;
export declare function extractCapability(text: string): V3Features["capability"];
export declare function extractRefusal(text: string): V3Features["refusal"];
export declare function extractV3Features(responses: Record<string, string>, rejectsTemperature?: boolean | null): V3Features;
/** Log-Gaussian length-similarity kernel.
 * Score decays smoothly with |log(obs/ref)|. Symmetric and scale-invariant:
 * a 2× overshoot scores the same as a 2× undershoot. sigma=0.5 → 20% drift ≈
 * 0.94, 2× drift ≈ 0.38. */
export declare function lengthScoreLogGaussian(obs: number, ref: number): number;
export declare function implyFamily(features: V3Features): string | null;
export interface ClassifySubmodelV3Options {
    /** V2 step-1 family; scopes matching to this family */
    predictedFamily?: string;
    /** default 0.60 */
    confidenceThreshold?: number;
    /** from probe-run observation */
    rejectsTemperature?: boolean | null;
    /** runtime-overridable baseline pool (defaults to shipped V3_BASELINES) */
    baselines?: SubmodelBaselineV3[];
}
export declare function classifySubmodelV3(responses: Record<string, string>, options?: ClassifySubmodelV3Options): V3Output;
/** Re-score a previously-extracted V3Features vector (e.g. from probe history
 * JSON) against the baseline pool. Useful for replay / backtesting without
 * re-calling upstream. */
export declare function scoreExtractedFeatures(features: V3Features, options?: {
    baselines?: SubmodelBaselineV3[];
}): V3Output;
/** Test helper: assert pairwise uniqueness across the baseline fixture. */
export declare function verifyPairwiseUniqueness(): {
    unique: boolean;
    collisions: Array<[string, string]>;
};
export { V3_BASELINES, getBaselinesForFamily, getAllFamilies };
//# sourceMappingURL=sub-model-classifier-v3.d.ts.map
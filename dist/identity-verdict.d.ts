export type VerdictStatus = "clean_match" | "clean_match_family_only" | "clean_match_submodel_mismatch" | "plain_mismatch" | "spoof_behavior_induced" | "spoof_selfclaim_forged" | "ambiguous" | "insufficient_data";
/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. */
export declare const V3_HIGH_CONFIDENCE = 0.8;
/** Minimum signal score required for "complete match" (clean_match) verdict.
 *  Below this, family unanimity alone isn't strong enough to assert sub-model
 *  identity — falls back to clean_match_family_only. */
export declare const CLEAN_MATCH_MIN_SCORE = 0.65;
/** Coverage gap (errors / total) above which the verdict is forced to
 *  family_only with low confidence regardless of signal strength. */
export declare const COVERAGE_GAP_FORCE_FAMILY_ONLY = 0.15;
/** Coverage gap above which confidence is demoted by one band even if signals
 *  are otherwise strong. */
export declare const COVERAGE_GAP_DEMOTE_CONFIDENCE = 0.05;
export type ConfidenceBand = "high" | "medium" | "low";
export interface VerdictInput {
    claimedFamily: string | null;
    claimedModel: string | undefined;
    surface: {
        family: string;
        score: number;
    } | null;
    behavior: {
        family: string;
        score: number;
    } | null;
    v3: {
        family: string;
        modelId: string;
        displayName: string;
        score: number;
    } | null;
    /** Optional V3F (V3 + isRoundRate ensemble). Used as a second-opinion
     *  classifier to veto false-positive spoof flags when behavior alone diverges. */
    v3f?: {
        family: string;
        score: number;
    } | null;
    /** Optional coverage stats. When errors/total > 0.15, force family_only
     *  with confidence=low even if other signals look strong, since missing
     *  data could be sampling bias. */
    coverage?: {
        errors: number;
        total: number;
    };
}
export interface VerdictResult {
    status: VerdictStatus;
    trueFamily: string | null;
    trueModel: string | null;
    spoofMethod: "behavior_induced" | "selfclaim_forged" | null;
    confidence: ConfidenceBand;
    reasoning: string[];
}
export declare function computeVerdict(input: VerdictInput): VerdictResult;
//# sourceMappingURL=identity-verdict.d.ts.map
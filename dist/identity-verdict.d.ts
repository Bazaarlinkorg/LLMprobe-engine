export type VerdictStatus = "clean_match" | "clean_match_submodel_mismatch" | "plain_mismatch" | "spoof_behavior_induced" | "spoof_selfclaim_forged" | "ambiguous" | "insufficient_data";
/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. Surfaces to UI as "信心不足，僅供參考". */
export declare const V3_HIGH_CONFIDENCE = 0.8;
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
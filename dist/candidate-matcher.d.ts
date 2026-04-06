import type { FingerprintFeatureSet, IdentityCandidate, IdentityStatus } from "./identity-report.js";
/**
 * Score each family baseline against the observed feature set.
 * Returns top-3 candidates sorted by score descending, normalized to 0-1.
 */
export declare function matchCandidates(features: FingerprintFeatureSet): IdentityCandidate[];
/**
 * Given top candidates and a claimed family, derive the overall verdict.
 * - "match": top candidate matches claimed family with confidence > 0.5
 * - "mismatch": top candidate is a different known family with high score
 * - "uncertain": no clear signal, no claimed family, or scores too close
 */
export declare function deriveVerdict(candidates: IdentityCandidate[], claimedFamily: string | undefined): {
    status: IdentityStatus;
    confidence: number;
    evidence: string[];
};
/** Convenience: resolve claimedModel string to family, then derive verdict. */
export declare function deriveVerdictFromClaimedModel(candidates: IdentityCandidate[], claimedModel: string | undefined): {
    status: IdentityStatus;
    confidence: number;
    evidence: string[];
    predictedFamily: string | undefined;
};
//# sourceMappingURL=candidate-matcher.d.ts.map
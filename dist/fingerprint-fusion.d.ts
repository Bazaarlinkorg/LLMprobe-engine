import type { FamilyScore, IdentityCandidate } from "./identity-report.js";
/**
 * Fuse three signal sources into a ranked IdentityCandidate[].
 *
 * - ruleScores:   from matchCandidatesRaw() — always present
 * - judgeScores:  from judgeFingerprint()   — empty [] if unavailable
 * - vectorScores: from pickTopVectorScores() — empty [] if unavailable
 *
 * Returns top-3 candidates with fused 0-1 score.
 */
export declare function fuseScores(ruleScores: FamilyScore[], judgeScores: FamilyScore[], vectorScores: FamilyScore[]): IdentityCandidate[];
//# sourceMappingURL=fingerprint-fusion.d.ts.map
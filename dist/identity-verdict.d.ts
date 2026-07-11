export type VerdictStatus = "clean_match" | "clean_match_family_only" | "clean_match_submodel_mismatch" | "plain_mismatch" | "spoof_behavior_induced" | "spoof_selfclaim_forged" | "ambiguous" | "insufficient_data";
/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. Surfaces to UI as "信心不足，僅供參考". */
export declare const V3_HIGH_CONFIDENCE = 0.8;
/** Minimum signal score required for "complete match" (clean_match) verdict.
 *  Below this, family unanimity alone isn't strong enough to assert sub-model
 *  identity — falls back to clean_match_family_only. (2026-04-26: a 59%/59%
 *  surface+behavior pair was previously granted ✓ 相符, which over-promised.) */
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
    /** Optional V3F (V3 + isRoundRate ensemble, 2026-04-25). Used as a second-opinion
     *  classifier to veto false-positive spoof flags when behavior alone diverges. */
    v3f?: {
        family: string;
        score: number;
    } | null;
    /** Optional coverage stats (2026-04-26). When errors/total > 0.15, force
     *  family_only with confidence=low even if other signals look strong, since
     *  missing data could be sampling bias. */
    coverage?: {
        errors: number;
        total: number;
    };
    /** Whether the claimed↔detected sub-model pair is separable by a V3H border
     *  policy (2026-07-03). Default true. When false — the family's siblings are
     *  behaviourally near-identical and we have NO border baseline for them — a
     *  confident V3 pick is not trustworthy, so we DO NOT assert a sub-model
     *  substitution (已替換); the verdict falls through to family_only instead. */
    subModelSeparable?: boolean;
}
export interface VerdictResult {
    status: VerdictStatus;
    trueFamily: string | null;
    trueModel: string | null;
    spoofMethod: "behavior_induced" | "selfclaim_forged" | null;
    confidence: ConfidenceBand;
    reasoning: string[];
}
/** Recompute the sub-model dimension of an existing clean-family verdict after a V3H
 *  authoritative override replaced V4's sub-model pick. The FAMILY dimension is untouched
 *  (V3H is same-family and only fires under a confident confirmed family). Only the
 *  sub-model verdict flips:
 *   • V3H top === claim → the family+submodel match is clean → `clean_match`.
 *   • V3H top !== claim → a same-family substitution is asserted → `clean_match_submodel_mismatch`.
 *  A no-op for verdicts that were not in the clean-family band (spoof/plain_mismatch/etc.) —
 *  V3H never contradicts those, and we don't want to launder a spoof into a clean match.
 *  `overrideModelId` is the V3H top; `overrideDisplayName` its readable name. */
/** The V3H post-run verdict-patch decision, extracted pure (2026-07-10).
 *
 *  Root cause of the dead path it replaces: the route builds `patch = { ...ia0, v3g, v3h }`,
 *  so `patch.verdict` already holds the PRE-V3H verdict from the spread — a `!patch.verdict`
 *  guard on the strong-pass assert (b621e1cb) was therefore never true, and a strong-pass
 *  V3H that AGREED with the fuse could never upgrade family_only → clean_match (dev repro:
 *  gpt-5.6-terra 2026-07-10). This helper takes what the guard actually meant — "did the
 *  PROMOTION branch set a verdict?" — as an explicit argument.
 *
 *  Returns the verdict to store, or null when nothing should change:
 *   • `promoted` non-null (promotion branch already recomputed) → return it unchanged.
 *   • V3H strong-pass with an in-family top → recompute vs the CLAIM; return it only
 *     when the status actually changes (avoids a no-op reasoning line).
 *   • anything else → null. */
/** Family-fusion confidence required before an `ambiguous` verdict may be downgraded. */
export declare const AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE = 0.9;
/** A diverging behavior signal AT OR ABOVE this is a real disagreement — never downgrade.
 *  Below it, the signal was already too weak for computeVerdict's spoof bar (0.70) and too
 *  weak for CLEAN_MATCH_MIN_SCORE; it lost to a confident family fusion + a strong-pass V3H. */
export declare const AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE = 0.65;
export declare function resolveV3HVerdictPatch(prev: VerdictResult | null | undefined, promoted: VerdictResult | null, v3h: {
    strongPass?: boolean;
    topModel?: string | null;
}, family: string | null | undefined, claimedModel: string | null | undefined, overrideDisplayName: string, strictOpts?: {
    familyConfidence: number;
    divergingBehaviorScore: number;
}): VerdictResult | null;
export declare function recomputeVerdictAfterV3HOverride(prev: VerdictResult | null | undefined, overrideModelId: string, overrideDisplayName: string, claimedModel: string | undefined): VerdictResult;
export declare function computeVerdict(input: VerdictInput): VerdictResult;
//# sourceMappingURL=identity-verdict.d.ts.map
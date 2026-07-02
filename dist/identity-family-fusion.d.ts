export interface FamilyFusionInput {
    /** V2 behavioural family (phase-1 English linguistic classifier). */
    v2Family?: string | null;
    /** V2 family scores (for confidence). */
    v2Scores?: Record<string, number> | null;
    /** Chinese-axis result from detectLinguisticFamily(). */
    chinese?: {
        family: string;
        confidence: number;
        hardOverride: boolean;
        evidence: string[];
    } | null;
    /** Family implied by the V3 scoped classifier (corroboration). */
    v3FamilyImplied?: string | null;
    /** Claimed family — DIAGNOSTIC ONLY; never becomes confirmedFamily. */
    claimedFamily?: string | null;
}
export type FamilyEvidenceSource = "chinese-self-id" | "v2" | "abstain";
export interface FamilyFusionResult {
    /** The single family used for ALL downstream sub-model scoping. null = abstain. */
    confirmedFamily: string | null;
    confidence: number;
    source: FamilyEvidenceSource;
    /** true when a Chinese self-ID overrode the English/V2 family. */
    hardOverride: boolean;
    /** true when the claimed family differed from the confirmed (behavioural) family. */
    claimIgnored: boolean;
    evidence: string[];
}
export declare function fuseFamily(input: FamilyFusionInput): FamilyFusionResult;
//# sourceMappingURL=identity-family-fusion.d.ts.map
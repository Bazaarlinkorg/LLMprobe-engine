export type IdentityStatus = "match" | "mismatch" | "uncertain" | "insufficient_data";
export interface IdentityCandidate {
    model: string;
    family: string;
    score: number;
    reasons: string[];
}
export interface SubModelMatch {
    topModel: string;
    topSimilarity: number;
    candidates: Array<{
        modelId: string;
        similarity: number;
    }>;
    claimedMatch: boolean;
    /** Attack-resistant candidates: same model order, similarities computed
     *  with selfClaim zeroed out (simulates selfClaim spoofing attack). */
    candidatesAttack?: Array<{
        modelId: string;
        similarity: number;
    }>;
    /** True when STEP 2 abstained due to insufficient STEP 1 family confidence.
     *  When true, topModel/topSimilarity/candidates are not meaningful and the
     *  UI should render an abstain banner instead of similarity bars. */
    abstained?: boolean;
    /** Human-readable explanation shown next to the abstain banner. */
    abstainReason?: string;
}
export interface IdentityAssessment {
    status: IdentityStatus;
    confidence: number;
    claimedModel: string | undefined;
    predictedFamily: string | undefined;
    predictedCandidates: IdentityCandidate[];
    riskFlags: string[];
    evidence: string[];
    subModelMatch?: SubModelMatch;
    /** Top linguistic-fingerprint-only match score (0–1), null if no ling probes ran. */
    linguisticIdentityScore?: number | null;
    /** Family predicted by linguistic signals alone. */
    linguisticIdentityFamily?: string | null;
    /** Display name for the family (e.g. "Anthropic / Claude"). */
    linguisticIdentityDisplayName?: string | null;
    /** Specific sub-model identified by linguistic signals (e.g. "anthropic/claude-opus-4.6"). */
    linguisticIdentityModel?: string | null;
    /** Cosine similarity of the top linguistic sub-model match (0–1). */
    linguisticIdentityModelSimilarity?: number | null;
    /**
     * Per-family linguistic fingerprint scores (0–1) for ALL families that have baselines.
     * Populated from matchCandidatesRaw() when linguistic probes produce signals.
     * Used by the probe report UI for cross-family comparison bars.
     */
    linguisticCrossFamilyScores?: Record<string, number>;
    /**
     * Per-family scores computed with FULL features (including selfClaim).
     * Paired with linguisticCrossFamilyScores in the UI to show non-attack vs
     * attack-resistant percentages side-by-side.
     */
    fullFamilyScores?: Record<string, number>;
    /** Bayesian posterior of the top sub-model (0–1). */
    subModelPosterior?: number | null;
    /** True when top posterior was below the 95% threshold and we abstained. */
    subModelAbstained?: boolean | null;
    /** Full sub-model posterior distribution for transparency. */
    subModelPosteriors?: Array<{
        modelId: string;
        posterior: number;
    }>;
    /**
     * Spoof detection: set when the non-attack column's top family differs
     * meaningfully from the attack-resistant column's top family, indicating
     * the endpoint's surface self-claim may be hiding its true behavior.
     * When populated, the UI renders a dedicated "系統 prompt 偽裝" warning.
     */
    spoofDetection?: {
        surfaceFamily: string;
        surfaceScore: number;
        behaviorFamily: string;
        behaviorScore: number;
    };
    /**
     * V3 sub-model classifier output. Populated only when all 3 V3 probes fired.
     */
    v3?: {
        subModelMatch: {
            modelId: string;
            displayName: string;
            family: string;
            score: number;
        } | null;
        candidates: Array<{
            modelId: string;
            displayName: string;
            family: string;
            score: number;
        }>;
        /** Global (cross-family) V3 result from the same 3 probes without family scoping. */
        global?: {
            subModelMatch: {
                modelId: string;
                displayName: string;
                family: string;
                score: number;
            } | null;
            candidates: Array<{
                modelId: string;
                displayName: string;
                family: string;
                score: number;
            }>;
            abstained: boolean;
        };
        familyImplied: string | null;
        familyMismatch: boolean;
        abstained: boolean;
        features: {
            cutoff: string | null;
            capabilityAnswers: Record<string, string | null>;
            refusalLead: string;
        };
    };
    /**
     * Three-way cross-reference verdict. Computed from surface + behavior + v3
     * fingerprints against claimedFamily. Absent on legacy runs.
     */
    verdict?: {
        status: "clean_match" | "clean_match_family_only" | "clean_match_submodel_mismatch" | "plain_mismatch" | "spoof_behavior_induced" | "spoof_selfclaim_forged" | "ambiguous" | "insufficient_data";
        trueFamily: string | null;
        trueModel: string | null;
        spoofMethod: "behavior_induced" | "selfclaim_forged" | null;
        confidence: "high" | "medium" | "low";
        reasoning: string[];
    };
    /**
     * V3C post-processing marker. Triggered when global V3 confidently disagrees
     * with the claimed model identity.
     */
    v3c?: {
        enabled: true;
        triggered: boolean;
        reason?: string;
    };
    /**
     * V3E ensemble sub-model classifier output. Passthrough from the adapter;
     * populated when the caller runs classifySubmodelV3E on the same probe
     * responses.
     */
    v3e?: {
        top: {
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        } | null;
        candidates: Array<{
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        }>;
        abstained: boolean;
    };
    /**
     * V3F classifier result. V3E features + improved scoring (uncertainty
     * similarity now weights isRoundRate equally with valueAvg gaussian).
     * Distinguishes same-family models V3E abstains on.
     */
    v3f?: {
        top: {
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        } | null;
        candidates: Array<{
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        }>;
        abstained: boolean;
    };
    /**
     * IKP factual-consistency sub-model cross-check. Used to rescue V3 abstain
     * or mark ambiguity when V3 and hidden consistency signals disagree.
     */
    ikp?: {
        top: {
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        } | null;
        candidates: Array<{
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        }>;
        abstained: boolean;
    };
    /**
     * V4 ensemble fuse result. Combines V3 Scoped, V3 Global, and IKP via the
     * 4-tier priority rules. Replaces V3F as the primary sub-model panel in the
     * UI. See src/sub-model-classifier-v4.ts.
     */
    v4?: {
        top: {
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        } | null;
        candidates: Array<{
            modelId: string;
            family: string;
            displayName: string;
            score: number;
        }>;
        abstained: boolean;
        fuseSource: "v3-scoped" | "v3-global" | "ikp" | "v3f" | "abstain";
        crossFamilyDisagreement: boolean;
    };
    identityOnly?: boolean;
}
/**
 * Feature signals extracted from behavioral probe responses.
 * Each sub-object maps a signal key to a numeric weight (0 = absent, 1 = present).
 *
 * `subModelSignals`, `linguisticFingerprint`, and `textStructure` are optional
 * to preserve backward compatibility with legacy baselines and existing
 * fingerprint extractors that do not populate them.
 */
export interface FingerprintFeatureSet {
    selfClaim: Record<string, number>;
    lexical: Record<string, number>;
    reasoning: Record<string, number>;
    jsonDiscipline: Record<string, number>;
    refusal: Record<string, number>;
    listFormat: Record<string, number>;
    /** Continuous signals for sub-model differentiation. */
    subModelSignals?: Record<string, number>;
    /** Linguistic fingerprint: answer distributions from multi-run probes. */
    linguisticFingerprint?: Record<string, number>;
    /** Text-structural lexical features aggregated across all response texts. */
    textStructure?: Record<string, number>;
}
/** Raw 0-1 score for one model family from a single signal source. */
export interface FamilyScore {
    family: string;
    score: number;
}
/** Per-signal breakdown for transparency in the final assessment. */
export interface FingerprintSignals {
    ruleScores: FamilyScore[];
    judgeScores: FamilyScore[];
    vectorScores: FamilyScore[];
}
//# sourceMappingURL=identity-report.d.ts.map
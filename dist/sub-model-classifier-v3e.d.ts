import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
export interface RefusalLadderFeatures {
    /** 8-rung compliance vector: 0=compliant, 1=partial, 2=refused. */
    vector: number[];
    refusedCount: number;
    partialCount: number;
    firstRefusalRung: number;
    citesLegal: boolean;
    cites988: boolean;
    avgRefusalLength: number;
}
export interface FormattingFeatures {
    /** Dominant bullet char in v3e_fmt_bullets ("-", "*", "bullet-dot", "1." for ordered, or "none").
     *  The string "bullet-dot" is used as a stable ASCII representation of the U+2022 glyph that
     *  some models emit; the regex still detects U+2022 in input text. */
    bulletChar: string;
    /** Max markdown header depth (# = 1, ## = 2, 0 = none). */
    headerDepth: number;
    /** Code fence language tag ("python", "py", "", or null if no fence). */
    codeLangTag: string | null;
    /** Does the model use em-dash (U+2014) anywhere? */
    usesEmDash: boolean;
}
export interface UncertaintyFeatures {
    /** Parsed integer 0-100, or null if not a valid number. */
    value: number | null;
    /** True if value ends in 0 or 5 (evidence of rounding bias). */
    isRound: boolean;
}
export declare function extractRefusalLadder(responses: Record<string, string>): RefusalLadderFeatures;
export declare function extractFormatting(responses: Record<string, string>): FormattingFeatures;
export declare function extractUncertainty(responses: Record<string, string>): UncertaintyFeatures;
export interface V3EObserved {
    refusalLadder: RefusalLadderFeatures;
    formatting: FormattingFeatures;
    uncertainty: UncertaintyFeatures;
}
export interface V3EMatch {
    modelId: string;
    family: string;
    displayName: string;
    score: number;
    matched: string[];
    divergent: string[];
}
export interface V3EOutput {
    observed: V3EObserved;
    top: V3EMatch | null;
    candidates: V3EMatch[];
    abstained: boolean;
}
export interface V3EFamilyVote {
    family: string;
    weight: number;
    reason: string;
}
export interface V3EWeights {
    ladder: number;
    formatting: number;
    uncertainty: number;
    citationBonus: number;
}
export declare const DEFAULT_V3E_WEIGHTS: V3EWeights;
export declare function inferFamilyVotesFromV3EObserved(observed: V3EObserved): V3EFamilyVote[];
export declare function inferFamilyVotesFromV3EResponses(responses: Record<string, string>): V3EFamilyVote[];
export declare function scoreV3EMatch(obs: V3EObserved, ref: SubmodelBaselineV3E, weights?: V3EWeights): {
    score: number;
    matched: string[];
    divergent: string[];
};
export declare function classifySubmodelV3E(responses: Record<string, string>, baselines: SubmodelBaselineV3E[], options?: {
    predictedFamily?: string;
    confidenceThreshold?: number;
    weights?: V3EWeights;
}): V3EOutput;
export type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
//# sourceMappingURL=sub-model-classifier-v3e.d.ts.map
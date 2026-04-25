import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
export interface RefusalLadderFeatures {
    /** 8-rung compliance vector: 0=compliant, 1=partial, 2=refused. */
    vector: number[];
    refusedCount: number;
    partialCount: number;
    /** Lowest index of 2 (0-7), or -1 if none. */
    firstRefusalRung: number;
    citesLegal: boolean;
    cites988: boolean;
    /** Avg char count of refused rungs. */
    avgRefusalLength: number;
}
export interface FormattingFeatures {
    /** Dominant bullet char in v3e_fmt_bullets ("-", "*", "bullet-dot", "1." for ordered, or "none"). */
    bulletChar: string;
    /** Max markdown header depth (# = 1, ## = 2, 0 = none). */
    headerDepth: number;
    /** Code fence language tag ("python", "py", "", or null if no fence). */
    codeLangTag: string | null;
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
export interface V3EWeights {
    ladder: number;
    formatting: number;
    uncertainty: number;
    citationBonus: number;
}
export declare const DEFAULT_V3E_WEIGHTS: V3EWeights;
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
export type ProbeGroup = "quality" | "security" | "integrity" | "identity";
export type ScoringMode = "llm_judge" | "keyword_match" | "exact_match" | "header_check" | "human_review" | "token_check" | "sse_compliance" | "thinking_check" | "consistency_check" | "context_check" | "feature_extract";
export interface ProbeDefinition {
    id: string;
    label: string;
    group: ProbeGroup;
    scoring: ScoringMode;
    prompt: string;
    expectedContains?: string;
    failIfContains?: string[];
    passIfContains?: string[];
    headerKey?: string;
    description: string;
    optional?: boolean;
    neutral?: boolean;
}
export declare const PROBE_SUITE: ProbeDefinition[];
export declare function autoScore(probe: ProbeDefinition, responseText: string, responseHeaders?: Record<string, string>): {
    passed: boolean;
    reason: string;
} | null;
//# sourceMappingURL=probe-suite.d.ts.map
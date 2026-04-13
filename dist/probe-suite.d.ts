export type ProbeGroup = "quality" | "security" | "integrity" | "identity" | "signature" | "multimodal";
export type ScoringMode = "llm_judge" | "keyword_match" | "exact_match" | "exact_response" | "header_check" | "human_review" | "token_check" | "sse_compliance" | "thinking_check" | "consistency_check" | "adaptive_check" | "context_check" | "feature_extract" | "channel_signature" | "signature_verify";
export interface ProbeDefinition {
    id: string;
    label: string;
    group: ProbeGroup;
    scoring: ScoringMode;
    prompt: string;
    /** For exact_match: the response must contain this string */
    expectedContains?: string;
    /** For keyword_match: FAIL if response contains any of these */
    failIfContains?: string[];
    /** For keyword_match: PASS if response contains any of these (checked after failIfContains) */
    passIfContains?: string[];
    /** For keyword_match: trimmed response must match this regex source (case-insensitive) — whitelist.
     *  Checked after forbidPatterns and before passIfContains. */
    requirePattern?: string;
    /** For keyword_match: response (lowercased) must NOT match any of these regex sources — blacklist.
     *  Checked after failIfContains, before requirePattern. */
    forbidPatterns?: string[];
    /** For header_check: check this response header for a value */
    headerKey?: string;
    /** For exact_response: the full trimmed response must match this string (case-insensitive) */
    expectedExact?: string;
    /** For adaptive_check: second request prompt (with sensitive trigger keyword) */
    adaptiveTriggerPrompt?: string;
    description: string;
    /** Optional probes are skipped by default; must be explicitly enabled */
    optional?: boolean;
    /** Neutral probes run and display results but are excluded from the score calculation */
    neutral?: boolean;
    /** Attack category from arxiv 2604.08407: AC-1, AC-1.a, AC-1.b, AC-2, AC-5 */
    acCategory?: string;
    /** Override default max_tokens for this probe (default: 64 for exact_match/exact_response, 1024 otherwise) */
    maxTokens?: number;
    /** Optional system prompt injected as a system message before the user turn */
    systemPrompt?: string;
    /** If true, runner generates a random canary per run, substitutes canaryPlaceholder in prompt,
     *  and uses the canary as expectedExact. Prevents whitelist-bypass attacks against static canaries. */
    dynamicCanary?: boolean;
    /** Placeholder token replaced with the random canary at run time. Default: "{CANARY}". */
    canaryPlaceholder?: string;
    /** For multimodal probes: non-text content block attached to the user message */
    multimodalContent?: {
        kind: "image" | "pdf";
        /** Base64-encoded payload, no data: prefix */
        dataB64: string;
        /** MIME type, e.g. image/png or application/pdf */
        mediaType: string;
    };
}
export declare function generateCanary(): string;
export declare const PROBE_SUITE: ProbeDefinition[];
export declare function autoScore(probe: ProbeDefinition, responseText: string, responseHeaders?: Record<string, string>, overrideExpectedExact?: string): {
    passed: boolean;
    reason: string;
} | null;
//# sourceMappingURL=probe-suite.d.ts.map
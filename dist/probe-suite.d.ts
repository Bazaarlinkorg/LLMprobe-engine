export type ProbeGroup = "quality" | "security" | "integrity" | "identity" | "signature" | "multimodal" | "submodel";
export type ScoringMode = "llm_judge" | "keyword_match" | "exact_match" | "exact_response" | "header_check" | "human_review" | "token_check" | "sse_compliance" | "thinking_check" | "consistency_check" | "adaptive_check" | "context_check" | "feature_extract" | "channel_signature";
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
    /** For keyword_match: trimmed response must match this regex source (case-insensitive via `i` flag) — acts as a whitelist. Checked after forbidPatterns and before passIfContains. */
    requirePattern?: string;
    /** For keyword_match: response (lowercased, untrimmed) must NOT match any of these regex sources — acts as a blacklist. Matched against lowercased text, so patterns with uppercase letters silently never match; use the `i` flag in the caller's pattern or lowercase-only source. Checked after failIfContains, before requirePattern. */
    forbidPatterns?: string[];
    /** For header_check: check this response header for a value */
    headerKey?: string;
    /** For exact_response: the full trimmed response must match this string (case-insensitive) */
    expectedExact?: string;
    /** For adaptive_check: trigger prompt with sensitive keywords (sent as second request) */
    adaptiveTriggerPrompt?: string;
    description: string;
    /** Optional probes are skipped by default; must be explicitly enabled */
    optional?: boolean;
    /** When true, render a small "NEW" badge next to this probe in the UI. */
    isNew?: boolean;
    /** Neutral probes run and display results but are excluded from the score calculation */
    neutral?: boolean;
    /** Attack category from arxiv 2604.08407: AC-1, AC-1.a, AC-1.b, AC-2 */
    acCategory?: string;
    /** Override default max_tokens for this probe (default: 64 for exact_match/exact_response, 1024 otherwise) */
    maxTokens?: number;
    /** Optional system prompt prepended as a system message. Used by AC-2 probes to plant bait secrets the router must not exfiltrate. */
    systemPrompt?: string;
    /** If true, run route generates a random canary per run, substitutes
     *  `canaryPlaceholder` in `prompt`, and passes an `overrideExpectedExact`
     *  to autoScore. Prevents whitelist-bypass attacks against static canaries. */
    dynamicCanary?: boolean;
    /** Placeholder token replaced with the random canary at run time. Default: "{CANARY}". */
    canaryPlaceholder?: string;
    /** For multimodal probes: non-text content block attached to the user message. */
    multimodalContent?: {
        kind: "image" | "pdf";
        /** Base64-encoded payload, no data: prefix. */
        dataB64: string;
        /** MIME type, e.g. image/png or application/pdf. */
        mediaType: string;
    };
    /**
     * For linguistic fingerprint probes: run this many times per probe run.
     * Baseline build uses repeatCount * 3.
     * When set, probe results are distributions, not single responses.
     */
    repeatCount?: number;
}
export declare function generateCanary(): string;
export declare const PROBE_SUITE: ProbeDefinition[];
/** Prompts compatible with the existing model-evaluator (all except cache_detection and identity probes) */
export declare const EVAL_PROMPTS: {
    id: string;
    label: string;
    prompt: string;
}[];
/** Retest exclusion: probes that cannot be re-run individually. See specs/2026-04-14-probe-single-retest-design.md. */
export declare function isRetestable(probe: {
    id: string;
    group: string;
    scoring: string;
}): boolean;
/** Auto-score a probe result without an LLM judge. Returns null if scoring requires human review. */
export declare function autoScore(probe: ProbeDefinition, responseText: string, responseHeaders?: Record<string, string>, lang?: string, opts?: {
    overrideExpectedExact?: string;
}): {
    passed: boolean;
    reason: string;
} | null;
/** Build the messages array for a probe call, optionally prepending a system message. */
export declare function buildProbeMessages(probe: ProbeDefinition, overridePrompt?: string): Array<{
    role: "system" | "user";
    content: string;
}>;
//# sourceMappingURL=probe-suite.d.ts.map
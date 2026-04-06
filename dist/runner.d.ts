export interface ProbeResult {
    probeId: string;
    label: string;
    group: string;
    neutral: boolean;
    status: "done" | "error" | "skipped";
    passed: true | false | "warning" | null;
    passReason: string | null;
    ttftMs: number | null;
    durationMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    tps: number | null;
    response: string | null;
    error: string | null;
}
export interface RunReport {
    baseUrl: string;
    modelId: string;
    startedAt: string;
    completedAt: string;
    score: number;
    scoreMax: number;
    totalInputTokens: number | null;
    totalOutputTokens: number | null;
    results: ProbeResult[];
}
/**
 * Baseline responses keyed by probeId.
 * Obtained from `collect-baseline` or downloaded from the BazaarLink public API.
 */
export type BaselineMap = Record<string, string>;
export interface RunOptions {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    /** Include optional probes (e.g. context_length). Default: false */
    includeOptional?: boolean;
    /** Timeout per probe request in ms. Default: 180_000 */
    timeoutMs?: number;
    /** Called after each probe completes */
    onProgress?: (result: ProbeResult, index: number, total: number) => void;
    /** Judge endpoint for llm_judge probes (optional; skipped if absent) */
    judge?: {
        baseUrl: string;
        apiKey: string;
        modelId: string;
        /** Score threshold 1-10. Default: 7 */
        threshold?: number;
    };
    /**
     * Baseline responses to compare against during llm_judge scoring.
     * Keys are probeIds; values are the trusted baseline response text.
     * When provided, the judge compares candidate vs baseline for similarity (1-10).
     * Without a baseline, llm_judge probes are skipped.
     */
    baseline?: BaselineMap;
}
export declare function runProbes(options: RunOptions): Promise<RunReport>;
//# sourceMappingURL=runner.d.ts.map
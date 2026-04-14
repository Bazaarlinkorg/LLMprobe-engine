import { type CanaryAnswerResult } from "./canary-bench.js";
export interface CanaryInput {
    /** OpenAI-compatible base URL, e.g. "https://openrouter.ai/api/v1" */
    baseUrl: string;
    apiKey: string;
    modelId: string;
    /** Timeout per request in ms. Default: 60_000 */
    timeoutMs?: number;
}
export interface CanaryResult {
    verdict: "healthy" | "degraded" | "failed" | "error";
    /** 0.0–1.0 pass rate */
    score: number;
    totalChecks: number;
    passedChecks: number;
    avgLatencyMs: number;
    /** Model ID echoed back by the endpoint (if present) */
    servedModel: string | null;
    details: (CanaryAnswerResult & {
        latencyMs: number;
    })[];
    error: string | null;
}
export declare function runCanary(input: CanaryInput): Promise<CanaryResult>;
//# sourceMappingURL=canary-runner.d.ts.map
export interface PreflightOutcome {
    /** ok = proceed with probes; abort = fatal, stop immediately; warn = proceed with caution */
    outcome: "ok" | "abort" | "warn";
    reason: string;
}
/**
 * Classify a pre-flight HTTP response.
 *
 * @param status   HTTP status code from the pre-flight chat/completions request
 * @param rawBody  Raw response body text (may be empty or non-JSON)
 */
export declare function classifyPreflightResult(status: number, rawBody: string, lang?: string): PreflightOutcome;
//# sourceMappingURL=probe-preflight.d.ts.map
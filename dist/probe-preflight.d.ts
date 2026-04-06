export interface PreflightOutcome {
    outcome: "ok" | "abort" | "warn";
    reason: string;
}
export declare function classifyPreflightResult(status: number, rawBody: string): PreflightOutcome;
//# sourceMappingURL=probe-preflight.d.ts.map
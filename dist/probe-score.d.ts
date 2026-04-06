export interface ProbeRunItemLike {
    status: "pending" | "running" | "done" | "error" | "skipped";
    passed: true | false | "warning" | null;
    neutral: boolean;
}
export declare function computeProbeScore(items: ProbeRunItemLike[]): {
    low: number;
    high: number;
};
//# sourceMappingURL=probe-score.d.ts.map
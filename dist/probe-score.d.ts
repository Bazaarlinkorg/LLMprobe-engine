export interface ProbeRunItemLike {
    status: "pending" | "running" | "done" | "error" | "skipped";
    passed: true | false | "warning" | null;
    neutral: boolean;
}
/**
 * Calculate 0–100 quality scores from probe run items.
 * All completed items (done + error + skipped) are included in the denominator.
 * - true      = 1 point
 * - "warning" = 0.5 points
 * - false     = 0 points
 * - error     = 0 points
 * - null      = 0 points (low) / 1 point (high) — human review / no baseline
 *
 * Returns { low, high }:
 *   low  = conservative score (null items treated as failed)
 *   high = optimistic score (null items treated as passed)
 *   When no null items exist, low === high.
 */
export declare function computeProbeScore(items: ProbeRunItemLike[]): {
    low: number;
    high: number;
};
//# sourceMappingURL=probe-score.d.ts.map
export interface ProbeItemLike {
    tps: number | null;
    ttftMs: number | null;
}
/**
 * Extract normalized TPS/TTFT features from a list of probe run items.
 * All values in [0, 1]. Returns zeros if no valid data.
 */
export declare function extractPerformanceFeatures(items: ProbeItemLike[]): Record<string, number>;
//# sourceMappingURL=performance-fingerprint.d.ts.map
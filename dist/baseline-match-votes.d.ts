export interface BaselineRow {
    modelId: string;
    probeId: string;
    responseText: string;
}
/** Jaccard similarity on token sets, plus exact-match boost. */
export declare function responseSimilarity(a: string, b: string): number;
/**
 * Map an arbitrary modelId (e.g. "anthropic/claude-opus-4.6") to its family.
 * Accepts already-lowercase input.
 */
export declare function baselineModelIdToFamily(modelId: string): string;
/**
 * Winner-take-all voting: for each probe, find the family whose baselines
 * best match the observed response. Only cast a vote when the margin over
 * runner-up family exceeds `marginThreshold` (non-decisive probes are
 * skipped — they add noise otherwise).
 *
 * Uses MEAN-within-family similarity to avoid the family-size bias where
 * families with more baseline models have a higher "max" by chance.
 *
 * Output: { [family]: 0..1 } where the value is the fraction of decisive
 * probes this family won.
 */
export declare function computeBaselineMatchVotes(observed: Record<string, string>, baselines: BaselineRow[], opts?: {
    minProbes?: number;
    marginThreshold?: number;
    useMax?: boolean;
}): Record<string, number>;
//# sourceMappingURL=baseline-match-votes.d.ts.map
import type { FingerprintFeatureSet } from "./identity-report.js";
import type { ProbeItemLike } from "./performance-fingerprint.js";
/** Minimal shape required by the build helpers. Compatible with both
 *  the in-memory ProbeRunItem (live runner) and the per-probe state the
 *  admin baseline builder accumulates. */
export interface BuildItem {
    probeId: string;
    response?: string | null;
    ttftMs?: number | null;
    durationMs?: number | null;
    tps?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    status?: string;
}
export interface FingerprintInputs {
    responses: Record<string, string>;
    linguisticResults: Record<string, string[]>;
    items: ProbeItemLike[];
    singleRunFallbacks: Record<string, string>;
}
/** All identity-group probes that feed extractLinguisticFeatures. Exported
 *  so the route handler can use the same set when building single-run
 *  fallbacks / deciding whether the identity phase has usable data. */
export declare const LING_PROBE_IDS: Set<string>;
/**
 * Canonical assembly policy:
 *   - responses: every probe item with a non-empty response string,
 *     regardless of probe group or scoring type. This ensures textStructure
 *     mining sees the maximum amount of text. The lexical extractors are
 *     pure regex over text — adding more probe responses cannot produce
 *     false positives, only more signal.
 *   - linguisticResults: passed through unchanged.
 *   - items: every item with both ttftMs and tps populated. Timing
 *     features (tps_bucket_*, ttft_bucket_*, out_len_*) require numeric
 *     timing data; items with null timings are filtered to avoid
 *     skewing the median calculations.
 *   - singleRunFallbacks: for each ling probe with a non-empty item.response,
 *     harvest it so the ling extractor can recover features when the 10×
 *     distribution is all-ERR.
 */
export declare function assembleFingerprintInputs(items: BuildItem[], linguisticResults: Record<string, string[]>): FingerprintInputs;
/** Convenience: assemble inputs and run the full extractor in one call.
 *  Both the live runner and the admin baseline build use this — never
 *  call extractFingerprint() directly from a route handler. */
export declare function extractFingerprintFromBuild(items: BuildItem[], linguisticResults: Record<string, string[]>): FingerprintFeatureSet;
//# sourceMappingURL=fingerprint-build-helpers.d.ts.map
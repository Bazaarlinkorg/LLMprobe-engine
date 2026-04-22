import type { FingerprintFeatureSet } from "./identity-report.js";
import { type ProbeItemLike } from "./performance-fingerprint.js";
/** Extract behavioral fingerprint features from probe response map. */
export declare function extractFingerprint(responses: Record<string, string>, linguisticResults?: Record<string, string[]>, items?: ProbeItemLike[], // ← new optional param (default empty array)
singleRunFallbacks?: Record<string, string>): FingerprintFeatureSet;
//# sourceMappingURL=fingerprint-extractor.d.ts.map
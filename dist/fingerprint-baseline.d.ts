import type { FingerprintFeatureSet } from "./identity-report.js";
export interface FamilyBaseline {
    family: string;
    displayName: string;
    /** Weighted signal rules: [featureCategory, signalKey, weight] */
    signals: Array<[keyof FingerprintFeatureSet, string, number]>;
}
/**
 * Signal weight table per model family.
 * Positive weight: signal supports this family.
 * Negative weight: signal contradicts this family.
 */
export declare const FAMILY_BASELINES: FamilyBaseline[];
export declare function claimedModelToFamily(claimedModel: string): string | undefined;
//# sourceMappingURL=fingerprint-baseline.d.ts.map
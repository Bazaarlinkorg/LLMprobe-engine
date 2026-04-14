import type { FingerprintFeatureSet } from "./identity-report.js";
export interface SubModelCandidate {
    modelId: string;
    similarity: number;
}
export interface StoredModelFingerprint {
    modelId: string;
    family: string;
    featureVector: FingerprintFeatureSet;
}
/** Flatten all feature categories into a single numeric vector. */
export declare function flattenFeatures(f: FingerprintFeatureSet): number[];
/**
 * Flatten only continuous subModelSignals for intra-family comparison.
 * Binary category signals (selfClaim, refusal, etc.) are identical across
 * all models within the same family and would dilute the discriminative signal.
 */
export declare function flattenSubModelSignals(f: FingerprintFeatureSet): number[];
/**
 * Compare observed fingerprint against stored per-model reference fingerprints
 * within a specific family. Returns candidates sorted by similarity descending.
 *
 * @param observed   Feature set extracted from the probe run.
 * @param references Stored fingerprints to compare against.
 * @param family     Restrict comparison to this family (e.g. "anthropic").
 */
export declare function matchSubModels(observed: FingerprintFeatureSet, references: StoredModelFingerprint[], family: string): SubModelCandidate[];
//# sourceMappingURL=sub-model-matcher.d.ts.map
import type { FingerprintFeatureSet } from "./identity-report.js";
import { type SubModelExtractorInput } from "./submodel-features.js";
import { type SubModelResult, type SubModelBaselineRow } from "./sub-model-bayesian.js";
export interface SubModelCandidate {
    modelId: string;
    similarity: number;
}
export interface StoredModelFingerprint {
    modelId: string;
    family: string;
    featureVector: FingerprintFeatureSet;
}
export declare function flattenLinguisticFeatures(f: FingerprintFeatureSet): number[];
export declare function flattenFeatures(f: FingerprintFeatureSet): number[];
/**
 * Flatten only the continuous subModelSignals for intra-family comparison.
 * Binary signals (selfClaim, refusal, etc.) are identical across all models
 * within the same family and would drown out the meaningful continuous signals.
 */
export declare function flattenSubModelSignals(f: FingerprintFeatureSet): number[];
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Compare linguistic fingerprint distributions against stored baselines.
 * Uses only linguisticFingerprint features (knowledge cutoff probes) for
 * intra-family sub-model identification.
 * Returns empty array if baselines don't have linguisticFingerprint data yet.
 */
export declare function matchSubModelsLinguistic(observed: FingerprintFeatureSet, references: StoredModelFingerprint[], family: string): SubModelCandidate[];
export declare function matchSubModels(observed: FingerprintFeatureSet, references: StoredModelFingerprint[], family: string, opts?: {
    useFullFeatures?: boolean;
}): SubModelCandidate[];
/**
 * Identify the specific sub-model within a family using the Bayesian classifier
 * over capability/verbosity/perf features.
 *
 * Baselines come from the DB (prisma.modelFingerprint — same table the prodadmin
 * baseline system manages). The caller loads them and passes them in. When the
 * family has fewer than 2 calibrated baselines, the result abstains.
 */
export declare function identifySubModelBayesian(input: SubModelExtractorInput, baselines: SubModelBaselineRow[]): SubModelResult;
/**
 * Extract SubModelBaselineRow[] from a set of DB ModelFingerprint rows.
 * Reads the baseline weights from featureVector.subModelWeights (written by the
 * prodadmin baseline build). Skips rows that don't have weights yet.
 */
export declare function baselinesFromDbRows(rows: Array<{
    modelId: string;
    family: string;
    featureVector: unknown;
}>, family: string): SubModelBaselineRow[];
//# sourceMappingURL=sub-model-matcher.d.ts.map
/**
 * Score a linguisticFingerprint feature map against family baselines.
 * Only uses signals from the "linguisticFingerprint" category.
 * Returns all families sorted descending, with scores normalized 0–1.
 */
export declare function scoreLinguisticOnly(lingFeatures: Record<string, number>): Array<{
    family: string;
    score: number;
}>;
/**
 * Score a full FingerprintFeatureSet against family baselines using ALL signal categories.
 * Returns all families sorted descending, with scores normalized 0–1.
 */
export declare function scoreFullFeatureSet(features: Record<string, Record<string, number>>): Array<{
    family: string;
    score: number;
}>;
/**
 * Map a modelId string to its known family.
 * Returns "unknown" if not recognized.
 */
export declare function modelIdToFamily(modelId: string): string;
/**
 * Accuracy stats for a single model across multiple probe records.
 */
export interface AccuracyStats {
    modelId: string;
    trueFamily: string;
    total: number;
    correct: number;
    accuracy: number;
    topPredictions: string[];
}
/**
 * Given an array of linguisticFingerprint feature objects for one model and its true family,
 * return accuracy stats.
 */
export declare function computeAccuracy(modelId: string, trueFamily: string, lingFeaturesList: Array<Record<string, number>>): AccuracyStats;
//# sourceMappingURL=backtest-scorer.d.ts.map
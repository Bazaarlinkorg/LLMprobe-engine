export declare function normalizeAnswer(raw: string): string;
export declare function computeDistribution(answers: string[]): Record<string, number>;
export declare function computeStability(dist: Record<string, number>): number;
export declare function modeAnswer(dist: Record<string, number>): string;
/**
 * Bhattacharyya coefficient between two probability distributions.
 * Equivalent to cosine similarity when both inputs are proper probability
 * distributions (values sum to 1.0). All callers should pass output from
 * computeDistribution(), which always satisfies this constraint.
 * @param a probability distribution (values must sum to 1.0)
 * @param b probability distribution (values must sum to 1.0)
 */
export declare function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number;
/**
 * Extract flattened numeric features from multi-run probe results.
 * @param results  Record<probeId, answers[]>
 * @returns        Record<signalKey, 0-1> — fits FingerprintFeatureSet.linguisticFingerprint
 */
export declare function extractLinguisticFeatures(results: Record<string, string[]>, singleRunFallbacks?: Record<string, string>): Record<string, number>;
//# sourceMappingURL=linguistic-fingerprint.d.ts.map
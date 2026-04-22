import type { FamilyBaseline } from "./fingerprint-baseline.js";
import type { FingerprintFeatureSet, FamilyScore } from "./identity-report.js";
/**
 * Convert a calibrated signal weight to a log-likelihood ratio contribution.
 * Calibration already produces log-odds-scale weights (e.g. w=2.0 ≈ e^2 ≈ 7.4x
 * evidence factor), so this is currently identity. Kept as a function so the
 * weight→log-odds mapping can be rescaled centrally if needed.
 */
export declare function toLogLikelihood(weight: number): number;
/**
 * Returns normalized family posteriors given observed features.
 * - Unobserved features (value 0) contribute 0 to log-odds (neutral)
 * - Observed features multiply log-odds by the weight
 * - Final scores are softmax-normalized probabilities summing to 1
 * - Sorted descending by score
 */
export declare function bayesianScore(features: FingerprintFeatureSet, baselines: FamilyBaseline[]): FamilyScore[];
/**
 * Temperature-scaled variant of bayesianScore for display purposes.
 * Pure softmax crushes scores to 0/1 when log-odds gaps are large (common
 * when selfClaim strongly favors one family). This version divides log-odds
 * by temperature before softmax, producing more human-readable spread.
 *
 * temperature=1.0 = same as bayesianScore (no scaling)
 * temperature=3.0 = moderate spread (recommended for UI)
 * temperature=10.0 = very flat (approaches uniform)
 *
 * Classification code should use bayesianScore (temperature=1). This function
 * is for UI display bars only.
 */
export declare function bayesianScoreDisplay(features: FingerprintFeatureSet, baselines: FamilyBaseline[], temperature?: number): FamilyScore[];
//# sourceMappingURL=fingerprint-bayesian.d.ts.map
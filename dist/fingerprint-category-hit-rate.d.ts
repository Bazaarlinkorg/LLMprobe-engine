import type { FamilyBaseline } from "./fingerprint-baseline.js";
import type { FingerprintFeatureSet } from "./identity-report.js";
/**
 * Compute the hit rate for one category against one family's baseline.
 *
 * "Hit rate" = (Σ weight × value) / (Σ weight), summed only over signals
 * with positive weight in the given category. Negative-weight signals
 * (contradictions) are excluded since this metric represents how much of
 * the supporting evidence for `family` is present.
 *
 * Returns null when the baseline has no positive-weight signals in this
 * category — the category is not informative for this family and the UI
 * should render "N/A".
 */
export declare function categoryHitRate(features: FingerprintFeatureSet, baseline: FamilyBaseline, category: string): number | null;
/**
 * Compute the target family's per-category hit rate normalized against the
 * highest hit rate any family achieves in that category.
 *
 * 100% means target leads (or ties for the lead) on this category; 50%
 * means target's evidence in this category is half as complete as the
 * family that fits it best.
 *
 * Returns null when:
 * - target family has no positive-weight signals in this category, or
 * - no family in `allFamilies` has any hits in this category, or
 * - target family is not present in `allFamilies`.
 */
export declare function relativeCategoryFitness(features: FingerprintFeatureSet, category: string, targetFamily: string, allFamilies: readonly FamilyBaseline[]): number | null;
//# sourceMappingURL=fingerprint-category-hit-rate.d.ts.map
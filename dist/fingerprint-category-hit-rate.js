"use strict";
// src/fingerprint-category-hit-rate.ts
// Per-category coverage of positive-weight signals for a given family baseline.
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryHitRate = categoryHitRate;
exports.relativeCategoryFitness = relativeCategoryFitness;
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
function categoryHitRate(features, baseline, category) {
    let weightTotal = 0;
    let weightFired = 0;
    for (const [cat, key, weight] of baseline.signals) {
        if (cat !== category)
            continue;
        if (weight <= 0)
            continue;
        weightTotal += weight;
        const v = features[cat]?.[key] ?? 0;
        if (v > 0)
            weightFired += weight * Math.min(1, v);
    }
    if (weightTotal === 0)
        return null;
    return weightFired / weightTotal;
}
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
function relativeCategoryFitness(features, category, targetFamily, allFamilies) {
    const target = allFamilies.find(b => b.family === targetFamily);
    if (!target)
        return null;
    const targetRate = categoryHitRate(features, target, category);
    if (targetRate === null)
        return null;
    let maxRate = 0;
    for (const baseline of allFamilies) {
        const rate = categoryHitRate(features, baseline, category);
        if (rate !== null && rate > maxRate)
            maxRate = rate;
    }
    if (maxRate === 0)
        return null;
    return targetRate / maxRate;
}
//# sourceMappingURL=fingerprint-category-hit-rate.js.map
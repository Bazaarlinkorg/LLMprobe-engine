/** Required top-1 posterior probability to claim a sub-model identification. */
export declare const CONFIDENCE_THRESHOLD = 0.95;
export interface SubModelPosterior {
    modelId: string;
    posterior: number;
}
export interface SubModelResult {
    candidates: SubModelPosterior[];
    top: SubModelPosterior;
    abstained: boolean;
}
/**
 * One model's row from the DB-backed baseline system.
 * `weights` is the list of [feature, log-likelihood-ratio] pairs.
 */
export interface SubModelBaselineRow {
    modelId: string;
    family: string;
    weights: Array<[string, number]>;
}
/**
 * Score observed features against a cohort of same-family sub-model baselines.
 * - Returns an abstain result when fewer than 2 baselines are present (nothing to distinguish).
 * - Aggregates per-model log-odds, softmax-normalizes into a probability distribution,
 *   then flags abstain when the top posterior is below CONFIDENCE_THRESHOLD.
 */
export declare function scoreSubModels(features: Record<string, number>, baselines: SubModelBaselineRow[]): SubModelResult;
//# sourceMappingURL=sub-model-bayesian.d.ts.map
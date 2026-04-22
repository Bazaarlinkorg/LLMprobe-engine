import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import type { V3Features } from "./sub-model-classifier-v3.js";
/** Boost applied per unique feature match in a baseline. */
export declare const UNIQUENESS_BOOST_PER_MATCH = 0.1;
/** Maximum total boost from uniqueness (safety cap). */
export declare const UNIQUENESS_BOOST_CAP = 0.3;
type FeatureKey = "cutoff" | `cap.${"q1_strawberry" | "q2_1000days" | "q3_apples" | "q4_prime" | "q5_backwards"}` | "refusal.lead" | `refusal.${"starts_with_no" | "starts_with_sorry" | "starts_with_cant" | "cites_18_usc" | "mentions_988" | "mentions_virtually_all" | "mentions_history_alt" | "mentions_pyrotechnics" | "mentions_policies" | "mentions_guidelines" | "mentions_illegal" | "mentions_harmful"}`;
/** For each baseline, return the set of feature keys whose value is unique
 * across the entire baseline pool. Pre-computed once; O(N × F). */
export declare function buildUniquenessMap(baselines: SubmodelBaselineV3[]): Map<string, Set<FeatureKey>>;
/** Compute uniqueness boost for (observation, baseline) pair. Returns score
 * to ADD to the base weighted score. Capped at UNIQUENESS_BOOST_CAP. */
export declare function uniquenessBoost(obs: V3Features, ref: SubmodelBaselineV3, uniquenessMap: Map<string, Set<FeatureKey>>): number;
export {};
//# sourceMappingURL=sub-model-v3-uniqueness.d.ts.map
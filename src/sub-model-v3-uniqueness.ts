// src/sub-model-v3-uniqueness.ts — pre-compute per-baseline unique features
// and provide a boost score for baselines whose unique features match the
// observation. Pure function — no I/O.

import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import type { V3Features } from "./sub-model-classifier-v3.js";

/** Boost applied per unique feature match in a baseline. */
export const UNIQUENESS_BOOST_PER_MATCH = 0.10;
/** Maximum total boost from uniqueness (safety cap). */
export const UNIQUENESS_BOOST_CAP = 0.30;

type FeatureKey =
  | "cutoff"
  | `cap.${"q1_strawberry" | "q2_1000days" | "q3_apples" | "q4_prime" | "q5_backwards"}`
  | "refusal.lead"
  | `refusal.${"starts_with_no" | "starts_with_sorry" | "starts_with_cant"
    | "cites_18_usc" | "mentions_988" | "mentions_virtually_all"
    | "mentions_history_alt" | "mentions_pyrotechnics" | "mentions_policies"
    | "mentions_guidelines" | "mentions_illegal" | "mentions_harmful"}`;

function baselineFeatureValue(b: SubmodelBaselineV3, key: FeatureKey): string {
  if (key === "cutoff") return b.cutoff;
  if (key.startsWith("cap.")) {
    const q = key.slice(4) as keyof SubmodelBaselineV3["capability"];
    return String(b.capability[q]);
  }
  if (key === "refusal.lead") return b.refusal.lead.slice(0, 20).toLowerCase();
  const flag = key.slice(8) as keyof Omit<SubmodelBaselineV3["refusal"], "lead" | "length_avg">;
  return String(b.refusal[flag]);
}

function observedFeatureValue(obs: V3Features, key: FeatureKey): string | null {
  if (key === "cutoff") return obs.cutoff ?? null;
  if (key.startsWith("cap.")) {
    const q = key.slice(4) as keyof V3Features["capability"];
    return obs.capability[q] ?? null;
  }
  if (key === "refusal.lead") return obs.refusal.lead.slice(0, 20).toLowerCase();
  const flag = key.slice(8) as keyof Omit<V3Features["refusal"], "lead" | "length">;
  return String(obs.refusal[flag]);
}

const ALL_FEATURE_KEYS: FeatureKey[] = [
  "cutoff",
  "cap.q1_strawberry", "cap.q2_1000days", "cap.q3_apples", "cap.q4_prime", "cap.q5_backwards",
  "refusal.lead",
  "refusal.starts_with_no", "refusal.starts_with_sorry", "refusal.starts_with_cant",
  "refusal.cites_18_usc", "refusal.mentions_988", "refusal.mentions_virtually_all",
  "refusal.mentions_history_alt", "refusal.mentions_pyrotechnics", "refusal.mentions_policies",
  "refusal.mentions_guidelines", "refusal.mentions_illegal", "refusal.mentions_harmful",
];

/** For each baseline, return the set of feature keys whose value is unique
 * across the entire baseline pool. Pre-computed once; O(N × F). */
export function buildUniquenessMap(
  baselines: SubmodelBaselineV3[],
): Map<string, Set<FeatureKey>> {
  const result = new Map<string, Set<FeatureKey>>();
  for (const b of baselines) result.set(b.modelId, new Set());

  for (const key of ALL_FEATURE_KEYS) {
    const valueToOwners = new Map<string, string[]>();
    for (const b of baselines) {
      const v = baselineFeatureValue(b, key);
      const owners = valueToOwners.get(v) ?? [];
      owners.push(b.modelId);
      valueToOwners.set(v, owners);
    }
    for (const [, owners] of valueToOwners) {
      if (owners.length === 1) result.get(owners[0])!.add(key);
    }
  }
  return result;
}

/** Compute uniqueness boost for (observation, baseline) pair. Returns score
 * to ADD to the base weighted score. Capped at UNIQUENESS_BOOST_CAP. */
export function uniquenessBoost(
  obs: V3Features,
  ref: SubmodelBaselineV3,
  uniquenessMap: Map<string, Set<FeatureKey>>,
): number {
  const uniqueFeatures = uniquenessMap.get(ref.modelId);
  if (!uniqueFeatures || uniqueFeatures.size === 0) return 0;

  let boost = 0;
  for (const key of uniqueFeatures) {
    const obsVal = observedFeatureValue(obs, key);
    if (obsVal === null) continue;
    if (obsVal === baselineFeatureValue(ref, key)) boost += UNIQUENESS_BOOST_PER_MATCH;
  }
  return Math.min(boost, UNIQUENESS_BOOST_CAP);
}

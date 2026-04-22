"use strict";
// src/sub-model-v3-uniqueness.ts — pre-compute per-baseline unique features
// and provide a boost score for baselines whose unique features match the
// observation. Pure function — no I/O.
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIQUENESS_BOOST_CAP = exports.UNIQUENESS_BOOST_PER_MATCH = void 0;
exports.buildUniquenessMap = buildUniquenessMap;
exports.uniquenessBoost = uniquenessBoost;
/** Boost applied per unique feature match in a baseline. */
exports.UNIQUENESS_BOOST_PER_MATCH = 0.10;
/** Maximum total boost from uniqueness (safety cap). */
exports.UNIQUENESS_BOOST_CAP = 0.30;
function baselineFeatureValue(b, key) {
    if (key === "cutoff")
        return b.cutoff;
    if (key.startsWith("cap.")) {
        const q = key.slice(4);
        return String(b.capability[q]);
    }
    if (key === "refusal.lead")
        return b.refusal.lead.slice(0, 20).toLowerCase();
    const flag = key.slice(8);
    return String(b.refusal[flag]);
}
function observedFeatureValue(obs, key) {
    if (key === "cutoff")
        return obs.cutoff ?? null;
    if (key.startsWith("cap.")) {
        const q = key.slice(4);
        return obs.capability[q] ?? null;
    }
    if (key === "refusal.lead")
        return obs.refusal.lead.slice(0, 20).toLowerCase();
    const flag = key.slice(8);
    return String(obs.refusal[flag]);
}
const ALL_FEATURE_KEYS = [
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
function buildUniquenessMap(baselines) {
    const result = new Map();
    for (const b of baselines)
        result.set(b.modelId, new Set());
    for (const key of ALL_FEATURE_KEYS) {
        const valueToOwners = new Map();
        for (const b of baselines) {
            const v = baselineFeatureValue(b, key);
            const owners = valueToOwners.get(v) ?? [];
            owners.push(b.modelId);
            valueToOwners.set(v, owners);
        }
        for (const [, owners] of valueToOwners) {
            if (owners.length === 1)
                result.get(owners[0]).add(key);
        }
    }
    return result;
}
/** Compute uniqueness boost for (observation, baseline) pair. Returns score
 * to ADD to the base weighted score. Capped at UNIQUENESS_BOOST_CAP. */
function uniquenessBoost(obs, ref, uniquenessMap) {
    const uniqueFeatures = uniquenessMap.get(ref.modelId);
    if (!uniqueFeatures || uniqueFeatures.size === 0)
        return 0;
    let boost = 0;
    for (const key of uniqueFeatures) {
        const obsVal = observedFeatureValue(obs, key);
        if (obsVal === null)
            continue;
        if (obsVal === baselineFeatureValue(ref, key))
            boost += exports.UNIQUENESS_BOOST_PER_MATCH;
    }
    return Math.min(boost, exports.UNIQUENESS_BOOST_CAP);
}
//# sourceMappingURL=sub-model-v3-uniqueness.js.map
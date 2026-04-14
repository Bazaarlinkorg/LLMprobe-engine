"use strict";
// src/sub-model-matcher.ts — Intra-family sub-model matching via cosine similarity
// Part of @bazaarlink/probe-engine (MIT)
//
// After the family is identified (matchCandidates), use matchSubModels() to
// narrow down to the specific model version within that family.
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenFeatures = flattenFeatures;
exports.flattenSubModelSignals = flattenSubModelSignals;
exports.cosineSimilarity = cosineSimilarity;
exports.matchSubModels = matchSubModels;
const CATEGORY_ORDER = [
    "selfClaim", "lexical", "reasoning", "jsonDiscipline", "refusal", "listFormat", "subModelSignals",
];
/** Flatten all feature categories into a single numeric vector. */
function flattenFeatures(f) {
    const vec = [];
    for (const cat of CATEGORY_ORDER) {
        const signals = f[cat] ?? {};
        for (const k of Object.keys(signals).sort()) {
            vec.push(signals[k] ?? 0);
        }
    }
    return vec;
}
/**
 * Flatten only continuous subModelSignals for intra-family comparison.
 * Binary category signals (selfClaim, refusal, etc.) are identical across
 * all models within the same family and would dilute the discriminative signal.
 */
function flattenSubModelSignals(f) {
    const signals = f.subModelSignals ?? {};
    return Object.keys(signals).sort().map(k => signals[k] ?? 0);
}
function cosineSimilarity(a, b) {
    const len = Math.min(a.length, b.length);
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}
/**
 * Compare observed fingerprint against stored per-model reference fingerprints
 * within a specific family. Returns candidates sorted by similarity descending.
 *
 * @param observed   Feature set extracted from the probe run.
 * @param references Stored fingerprints to compare against.
 * @param family     Restrict comparison to this family (e.g. "anthropic").
 */
function matchSubModels(observed, references, family) {
    const sameFamily = references.filter(r => r.family === family);
    if (sameFamily.length === 0)
        return [];
    const obsSubVec = flattenSubModelSignals(observed);
    const useSubOnly = obsSubVec.some(v => v > 0);
    const getVec = useSubOnly ? flattenSubModelSignals : flattenFeatures;
    const obsVec = useSubOnly ? obsSubVec : flattenFeatures(observed);
    return sameFamily
        .map(ref => {
        const refVec = getVec(ref.featureVector);
        const maxLen = Math.max(obsVec.length, refVec.length);
        const a = [...obsVec, ...Array(maxLen - obsVec.length).fill(0)];
        const b = [...refVec, ...Array(maxLen - refVec.length).fill(0)];
        return { modelId: ref.modelId, similarity: Math.round(cosineSimilarity(a, b) * 1000) / 1000 };
    })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
}
//# sourceMappingURL=sub-model-matcher.js.map
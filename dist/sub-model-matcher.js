"use strict";
// src/sub-model-matcher.ts — Compare observed fingerprint vs stored per-model fingerprints
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenLinguisticFeatures = flattenLinguisticFeatures;
exports.flattenFeatures = flattenFeatures;
exports.flattenSubModelSignals = flattenSubModelSignals;
exports.cosineSimilarity = cosineSimilarity;
exports.matchSubModelsLinguistic = matchSubModelsLinguistic;
exports.matchSubModels = matchSubModels;
exports.identifySubModelBayesian = identifySubModelBayesian;
exports.baselinesFromDbRows = baselinesFromDbRows;
const submodel_features_js_1 = require("./submodel-features.js");
const sub_model_bayesian_js_1 = require("./sub-model-bayesian.js");
const CATEGORY_ORDER = [
    "selfClaim", "lexical", "reasoning", "jsonDiscipline", "refusal", "listFormat", "subModelSignals",
];
function flattenLinguisticFeatures(f) {
    const signals = f.linguisticFingerprint ?? {};
    const keys = Object.keys(signals).sort();
    return keys.map(k => signals[k] ?? 0);
}
function flattenFeatures(f) {
    const vec = [];
    for (const cat of CATEGORY_ORDER) {
        const signals = f[cat] ?? {};
        const keys = Object.keys(signals).sort();
        for (const k of keys) {
            vec.push(signals[k] ?? 0);
        }
    }
    return vec;
}
/**
 * Flatten only the continuous subModelSignals for intra-family comparison.
 * Binary signals (selfClaim, refusal, etc.) are identical across all models
 * within the same family and would drown out the meaningful continuous signals.
 */
function flattenSubModelSignals(f) {
    const signals = f.subModelSignals ?? {};
    const keys = Object.keys(signals).sort();
    return keys.map(k => signals[k] ?? 0);
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
 * Compare linguistic fingerprint distributions against stored baselines.
 * Uses only linguisticFingerprint features (knowledge cutoff probes) for
 * intra-family sub-model identification.
 * Returns empty array if baselines don't have linguisticFingerprint data yet.
 */
function matchSubModelsLinguistic(observed, references, family) {
    const sameFamily = references.filter(r => r.family === family);
    if (sameFamily.length === 0)
        return [];
    const obsVec = flattenLinguisticFeatures(observed);
    if (!obsVec.some(v => v > 0))
        return [];
    const candidates = [];
    for (const ref of sameFamily) {
        const refVec = flattenLinguisticFeatures(ref.featureVector);
        if (!refVec.some(v => v > 0))
            continue; // baseline has no ling data
        const maxLen = Math.max(obsVec.length, refVec.length);
        const a = [...obsVec, ...new Array(maxLen - obsVec.length).fill(0)];
        const b = [...refVec, ...new Array(maxLen - refVec.length).fill(0)];
        candidates.push({ modelId: ref.modelId, similarity: Math.round(cosineSimilarity(a, b) * 1000) / 1000 });
    }
    return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}
function matchSubModels(observed, references, family, opts) {
    const sameFamily = references.filter(r => r.family === family);
    if (sameFamily.length === 0)
        return [];
    // Default: use only continuous subModelSignals for intra-family comparison.
    // Binary category signals (selfClaim, refusal, etc.) are identical across
    // models in the same family and dilute the discriminative continuous signals.
    // When useFullFeatures is set (attack variant), use ALL categories so that
    // zeroing selfClaim produces a different similarity for display purposes.
    const obsVec = opts?.useFullFeatures ? flattenFeatures(observed) : flattenSubModelSignals(observed);
    // Fall back to full feature vector if subModelSignals are empty (legacy baselines)
    const useSubOnly = !opts?.useFullFeatures && obsVec.some(v => v > 0);
    const getFn = opts?.useFullFeatures ? flattenFeatures : (useSubOnly ? flattenSubModelSignals : flattenFeatures);
    const obsBase = useSubOnly ? obsVec : (opts?.useFullFeatures ? obsVec : flattenFeatures(observed));
    return sameFamily
        .map(ref => {
        const refVec = getFn(ref.featureVector);
        const maxLen = Math.max(obsBase.length, refVec.length);
        const a = [...obsBase, ...Array(maxLen - obsBase.length).fill(0)];
        const b = [...refVec, ...Array(maxLen - refVec.length).fill(0)];
        return {
            modelId: ref.modelId,
            similarity: Math.round(cosineSimilarity(a, b) * 1000) / 1000,
        };
    })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
}
/**
 * Identify the specific sub-model within a family using the Bayesian classifier
 * over capability/verbosity/perf features.
 *
 * Baselines come from the DB (prisma.modelFingerprint — same table the prodadmin
 * baseline system manages). The caller loads them and passes them in. When the
 * family has fewer than 2 calibrated baselines, the result abstains.
 */
function identifySubModelBayesian(input, baselines) {
    const features = (0, submodel_features_js_1.extractSubModelFeatures)(input);
    return (0, sub_model_bayesian_js_1.scoreSubModels)(features, baselines);
}
/**
 * Extract SubModelBaselineRow[] from a set of DB ModelFingerprint rows.
 * Reads the baseline weights from featureVector.subModelWeights (written by the
 * prodadmin baseline build). Skips rows that don't have weights yet.
 */
function baselinesFromDbRows(rows, family) {
    const out = [];
    for (const row of rows) {
        if (row.family !== family)
            continue;
        const fv = row.featureVector;
        const weightMap = fv?.subModelWeights;
        if (!weightMap || typeof weightMap !== "object")
            continue;
        const weights = Object.entries(weightMap)
            .filter(([, v]) => typeof v === "number");
        if (weights.length === 0)
            continue;
        out.push({ modelId: row.modelId, family: row.family, weights });
    }
    return out;
}
//# sourceMappingURL=sub-model-matcher.js.map
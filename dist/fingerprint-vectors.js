"use strict";
// src/fingerprint-vectors.ts — Cosine similarity for fingerprint vector signal (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = cosineSimilarity;
exports.pickTopVectorScores = pickTopVectorScores;
exports.embedProbeResponses = embedProbeResponses;
const KNOWN_FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];
/** Cosine similarity between two vectors. Returns 0 for zero vectors. */
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
/**
 * Given a query embedding and a set of reference embeddings,
 * compute per-family similarity scores (0-1).
 * When multiple references exist for one family, takes the max similarity.
 * Normalises so the highest similarity = 1.0.
 */
function pickTopVectorScores(queryEmbedding, refs) {
    const familyMax = {};
    for (const ref of refs) {
        const sim = cosineSimilarity(queryEmbedding, ref.embedding);
        if (!(ref.family in familyMax) || sim > familyMax[ref.family]) {
            familyMax[ref.family] = sim;
        }
    }
    if (Object.keys(familyMax).length === 0) {
        return KNOWN_FAMILIES.map(family => ({ family, score: 0 }));
    }
    const maxSim = Math.max(...Object.values(familyMax), 0.0001);
    return KNOWN_FAMILIES.map(family => ({
        family,
        score: Math.min(1, Math.max(0, (familyMax[family] ?? 0) / maxSim)),
    }));
}
/**
 * Embed a block of probe responses text via an OpenAI-compatible embeddings endpoint.
 * Returns null if unavailable or if the request fails.
 */
async function embedProbeResponses(responses, baseUrl, apiKey, modelId) {
    if (!apiKey || !modelId || Object.keys(responses).length === 0)
        return null;
    const text = Object.entries(responses)
        .map(([id, r]) => `[${id}] ${r.slice(0, 600)}`)
        .join("\n\n");
    let url;
    try {
        url = new URL(baseUrl.replace(/\/+$/, "") + "/embeddings").href;
    }
    catch {
        return null;
    }
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, input: text }),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok)
            return null;
        const data = await res.json();
        return data.data?.[0]?.embedding ?? null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=fingerprint-vectors.js.map
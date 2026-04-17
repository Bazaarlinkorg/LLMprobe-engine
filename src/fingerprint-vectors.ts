// src/fingerprint-vectors.ts — Cosine similarity for fingerprint vector signal

import type { FamilyScore } from "./identity-report.js";

const KNOWN_FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];

export interface ReferenceEmbedding {
  family: string;
  embedding: number[];
}

/** Cosine similarity between two vectors. Returns 0 for zero vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
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
 * Normalizes so the highest similarity = 1.0.
 */
export function pickTopVectorScores(
  queryEmbedding: number[],
  refs: ReferenceEmbedding[],
): FamilyScore[] {
  // Per-family max similarity (raw cosine, -1 to 1)
  const familyMax: Record<string, number> = {};
  for (const ref of refs) {
    const sim = cosineSimilarity(queryEmbedding, ref.embedding);
    if (!(ref.family in familyMax) || sim > familyMax[ref.family]) {
      familyMax[ref.family] = sim;
    }
  }

  if (Object.keys(familyMax).length === 0) {
    return KNOWN_FAMILIES.map(family => ({ family, score: 0 }));
  }

  // Clamp negatives to 0, normalize by max positive
  const maxSim = Math.max(...Object.values(familyMax), 0.0001);
  return KNOWN_FAMILIES.map(family => ({
    family,
    score: Math.min(1, Math.max(0, (familyMax[family] ?? 0) / maxSim)),
  }));
}

/**
 * Embed a block of probe responses text via an OpenAI-compatible embeddings endpoint.
 * Returns null if unavailable.
 */
export async function embedProbeResponses(
  responses: Record<string, string>,
  baseUrl: string,
  apiKey: string,
  modelId: string,
): Promise<number[] | null> {
  if (!apiKey || !modelId || Object.keys(responses).length === 0) return null;

  const text = Object.entries(responses)
    .map(([id, r]) => `[${id}] ${r.slice(0, 600)}`)
    .join("\n\n");

  let url: string;
  try {
    url = new URL(baseUrl.replace(/\/+$/, "") + "/embeddings").href;
  } catch {
    return null;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, input: text }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ embedding?: number[] }> };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

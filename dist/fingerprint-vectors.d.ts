import type { FamilyScore } from "./identity-report.js";
export interface ReferenceEmbedding {
    family: string;
    embedding: number[];
}
/** Cosine similarity between two vectors. Returns 0 for zero vectors. */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Given a query embedding and a set of reference embeddings,
 * compute per-family similarity scores (0-1).
 * When multiple references exist for one family, takes the max similarity.
 * Normalises so the highest similarity = 1.0.
 */
export declare function pickTopVectorScores(queryEmbedding: number[], refs: ReferenceEmbedding[]): FamilyScore[];
/**
 * Embed a block of probe responses text via an OpenAI-compatible embeddings endpoint.
 * Returns null if unavailable or if the request fails.
 */
export declare function embedProbeResponses(responses: Record<string, string>, baseUrl: string, apiKey: string, modelId: string): Promise<number[] | null>;
//# sourceMappingURL=fingerprint-vectors.d.ts.map
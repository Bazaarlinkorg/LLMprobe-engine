import { describe, it, expect } from "vitest";
import { cosineSimilarity, pickTopVectorScores } from "../fingerprint-vectors.js";
import type { FamilyScore } from "../identity-report.js";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns -1.0 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  it("returns 0 for zero vector", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });
});

describe("pickTopVectorScores", () => {
  it("returns all-zero scores when no references given", () => {
    const scores = pickTopVectorScores([1, 0, 0], []);
    expect(scores.every((s: FamilyScore) => s.score === 0)).toBe(true);
    expect(scores.length).toBeGreaterThan(0);
  });

  it("returns normalized scores per family", () => {
    const queryEmbedding = [1, 0, 0];
    const refs = [
      { family: "anthropic", embedding: [1, 0, 0] },   // similarity = 1.0
      { family: "openai",    embedding: [0, 1, 0] },   // similarity = 0.0
    ];
    const scores = pickTopVectorScores(queryEmbedding, refs);
    const anthropic = scores.find((s: FamilyScore) => s.family === "anthropic");
    const openai    = scores.find((s: FamilyScore) => s.family === "openai");
    expect(anthropic?.score).toBeCloseTo(1.0);
    expect(openai?.score).toBeCloseTo(0.0);
  });
});

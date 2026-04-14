import { describe, it, expect } from "vitest";
import { flattenFeatures, cosineSimilarity, matchSubModels } from "../sub-model-matcher.js";
import type { FingerprintFeatureSet } from "../identity-report.js";
import type { StoredModelFingerprint } from "../sub-model-matcher.js";

function makeFeatures(overrides: Partial<FingerprintFeatureSet> = {}): FingerprintFeatureSet {
  return {
    selfClaim: { claimsClaude: 0, claimsGPT: 0 },
    lexical: { usesDelve: 0, usesI_think: 0 },
    reasoning: { starts_with_letme: 0, uses_chain_of_thought: 0 },
    jsonDiscipline: { pure_json: 0, markdown_polluted: 0 },
    refusal: { softRefusal: 0 },
    listFormat: { bold_headers: 0, plain_numbered: 0 },
    subModelSignals: { avgSentenceLen: 0, vocabularyRichness: 0, hedgingRate: 0 },
    ...overrides,
  };
}

describe("flattenFeatures", () => {
  it("produces a consistent numeric array", () => {
    const f = makeFeatures({ selfClaim: { claimsClaude: 1, claimsGPT: 0 } });
    const vec = flattenFeatures(f);
    expect(Array.isArray(vec)).toBe(true);
    expect(vec.every(v => typeof v === "number")).toBe(true);
    expect(vec.length).toBeGreaterThan(0);
  });

  it("produces identical arrays for identical inputs", () => {
    const f1 = makeFeatures({ lexical: { usesDelve: 1, usesI_think: 0.5 } });
    const f2 = makeFeatures({ lexical: { usesDelve: 1, usesI_think: 0.5 } });
    expect(flattenFeatures(f1)).toEqual(flattenFeatures(f2));
  });

  it("produces different arrays for different inputs", () => {
    const f1 = makeFeatures({ selfClaim: { claimsClaude: 1, claimsGPT: 0 } });
    const f2 = makeFeatures({ selfClaim: { claimsClaude: 0, claimsGPT: 1 } });
    expect(flattenFeatures(f1)).not.toEqual(flattenFeatures(f2));
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3, 4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it("handles vectors of different lengths (uses min length)", () => {
    const a = [1, 0, 0];
    const b = [1, 0];
    // only first 2 elements compared: dot=1, magA=1, magB=1 → 1
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});

describe("matchSubModels", () => {
  const baseFeatures = makeFeatures({
    selfClaim: { claimsClaude: 1, claimsGPT: 0 },
    subModelSignals: { avgSentenceLen: 0.7, vocabularyRichness: 0.5, hedgingRate: 0.3 },
  });

  const refs: StoredModelFingerprint[] = [
    {
      modelId: "claude-3.5-sonnet",
      family: "anthropic",
      featureVector: makeFeatures({
        selfClaim: { claimsClaude: 1, claimsGPT: 0 },
        subModelSignals: { avgSentenceLen: 0.7, vocabularyRichness: 0.5, hedgingRate: 0.3 },
      }),
    },
    {
      modelId: "claude-3-haiku",
      family: "anthropic",
      featureVector: makeFeatures({
        selfClaim: { claimsClaude: 1, claimsGPT: 0 },
        subModelSignals: { avgSentenceLen: 0.4, vocabularyRichness: 0.3, hedgingRate: 0.1 },
      }),
    },
    {
      modelId: "gpt-4o",
      family: "openai",
      featureVector: makeFeatures({
        selfClaim: { claimsClaude: 0, claimsGPT: 1 },
        subModelSignals: { avgSentenceLen: 0.6, vocabularyRichness: 0.6, hedgingRate: 0.2 },
      }),
    },
  ];

  it("filters by family", () => {
    const results = matchSubModels(baseFeatures, refs, "anthropic");
    expect(results.every(r => r.modelId !== "gpt-4o")).toBe(true);
  });

  it("returns empty for unknown family", () => {
    expect(matchSubModels(baseFeatures, refs, "mistral")).toEqual([]);
  });

  it("ranks identical reference highest", () => {
    const results = matchSubModels(baseFeatures, refs, "anthropic");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].modelId).toBe("claude-3.5-sonnet");
    expect(results[0].similarity).toBeCloseTo(1, 2);
  });

  it("returns at most 5 candidates", () => {
    const manyRefs: StoredModelFingerprint[] = Array.from({ length: 10 }, (_, i) => ({
      modelId: `model-${i}`,
      family: "test",
      featureVector: makeFeatures({ subModelSignals: { avgSentenceLen: i * 0.1 } }),
    }));
    const results = matchSubModels(makeFeatures(), manyRefs, "test");
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

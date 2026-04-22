// src/__tests__/sub-model-classifier-v3.test.ts

import { describe, expect, it } from "vitest";
import {
  classifySubmodelV3,
  extractV3Features,
  extractCutoff,
  extractCapability,
  extractRefusal,
  implyFamily,
  verifyPairwiseUniqueness,
  V3_BASELINES,
} from "../sub-model-classifier-v3.js";

describe("extractCutoff", () => {
  it("parses '2025-04'", () => {
    expect(extractCutoff("My cutoff is 2025-04")).toBe("2025-04");
  });
  it("parses '2024年6月'", () => {
    expect(extractCutoff("截止於 2024年6月")).toBe("2024-06");
  });
  it("zero-pads single-digit months", () => {
    expect(extractCutoff("cut 2024/3")).toBe("2024-03");
  });
  it("returns null on no match", () => {
    expect(extractCutoff("no date here")).toBeNull();
  });
});

describe("extractCapability", () => {
  it("parses numbered list answers", () => {
    const text = `
1. 3
2. tuesday
3. 6
4. 541
5. etadommocca
`;
    const cap = extractCapability(text);
    expect(cap.q1_strawberry).toBe("3");
    expect(cap.q2_1000days).toBe("tuesday");
    expect(cap.q3_apples).toBe("6");
    expect(cap.q4_prime).toBe("541");
    expect(cap.q5_backwards).toBe("etadommocca");
  });

  it("trims trailing punctuation", () => {
    expect(extractCapability("1. 3.").q1_strawberry).toBe("3");
    expect(extractCapability("2. Tuesday!").q2_1000days).toBe("tuesday");
  });
});

describe("extractRefusal", () => {
  it("skips leading blank lines (Anthropic quirk)", () => {
    const r = extractRefusal("\n\nI can't help with this.\n");
    expect(r.lead).toBe("I can't help with this.");
    expect(r.starts_with_cant).toBe(true);
    expect(r.starts_with_sorry).toBe(false);
  });

  it("detects 18 USC 842 citation (Opus 4.7 signature)", () => {
    const r = extractRefusal("I can't help. See 18 U.S.C. § 842 for details.");
    expect(r.cites_18_usc).toBe(true);
  });

  it("detects 988 hotline mention", () => {
    expect(extractRefusal("please call 988").mentions_988).toBe(true);
  });

  it("detects curly-apostrophe can't (GPT-5 style)", () => {
    const r = extractRefusal("I can’t help with that.");
    expect(r.starts_with_cant).toBe(true);
  });
});

describe("implyFamily", () => {
  it("cites_18_usc → anthropic", () => {
    const feats = extractV3Features({ submodel_refusal: "I can't help. See 18 USC 842." });
    expect(implyFamily(feats)).toBe("anthropic");
  });

  it("DeepSeek 'I understand you're asking' → deepseek", () => {
    const feats = extractV3Features({ submodel_refusal: "I understand you're asking about this." });
    expect(implyFamily(feats)).toBe("deepseek");
  });

  it("'No.' lead → anthropic", () => {
    const feats = extractV3Features({ submodel_refusal: "No. I'm not going to help." });
    expect(implyFamily(feats)).toBe("anthropic");
  });
});

describe("V3_BASELINES integrity", () => {
  it("every baseline has required fields", () => {
    for (const b of V3_BASELINES) {
      expect(b.modelId).toMatch(/\//);
      expect(b.family).toBeTruthy();
      expect(b.displayName).toBeTruthy();
      expect(b.cutoff).toMatch(/^\d{4}-\d{2}$/);
      expect(b.refusal.length_avg).toBeGreaterThan(0);
    }
  });

  it("no pairwise collisions within a family", () => {
    const result = verifyPairwiseUniqueness();
    expect(result.unique).toBe(true);
    expect(result.collisions).toEqual([]);
  });
});

describe("classifySubmodelV3 — happy path", () => {
  it("perfect Opus 4.7 responses → matches Opus 4.7 with high score", () => {
    const opus47 = V3_BASELINES.find(b => b.modelId === "anthropic/claude-opus-4.7")!;
    const out = classifySubmodelV3({
      submodel_cutoff: `My cutoff is ${opus47.cutoff}`,
      submodel_capability: `
1. 3
2. sunday
3. 6
4. 541
5. etadommocca
`,
      submodel_refusal: `${opus47.refusal.lead} — 18 U.S.C. § 842 applies. Pyrotechnics are dangerous. Call 988 if you need help.${"x".repeat(900)}`,
    }, { rejectsTemperature: true, predictedFamily: "anthropic" });

    expect(out.top).not.toBeNull();
    expect(out.top?.modelId).toBe("anthropic/claude-opus-4.7");
    expect(out.top?.score).toBeGreaterThan(0.75);
    expect(out.familyImplied).toBe("anthropic");
  });

  it("abstains when top-2 are within TIE_BREAK_GAP", () => {
    // Feed a barely-discriminating response; rely on real baselines clustering.
    const out = classifySubmodelV3({
      submodel_cutoff: "",
      submodel_capability: "",
      submodel_refusal: "",
    });
    // With empty input, multiple baselines score 0 and tie.
    expect(out.top).toBeNull();
  });
});

describe("classifySubmodelV3 — family mismatch flag", () => {
  it("flags wrapper-spoof when V2 predicts anthropic but V3 implies openai", () => {
    // GPT-5 style refusal text → implyFamily returns openai
    const out = classifySubmodelV3({
      submodel_cutoff: "2024-10",
      submodel_capability: "1. 3\n2. tuesday\n3. 6\n4. 541\n5. etadommocca",
      submodel_refusal: "I can’t help with instructions for that. Policy violations are harmful.",
    }, { predictedFamily: "anthropic" });

    expect(out.familyImplied).toBe("openai");
    expect(out.familyMismatch).toBe(true);
  });
});

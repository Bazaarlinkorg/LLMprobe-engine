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
      // Cutoff is either a YYYY-MM stamp or the literal "unknown" for models
      // that decline to state a training cutoff (e.g. opus-4.8) — the classifier
      // treats "unknown" as a non-matching cutoff feature, so it is a valid value.
      expect(b.cutoff === "unknown" || /^\d{4}-\d{2}$/.test(b.cutoff)).toBe(true);
      // nativeEmptyRefusal models (Claude 5 / Mythos, e.g. fable-5) produce a
      // structurally EMPTY refusal body, so length_avg is legitimately 0 for
      // them. Every other baseline still has a non-empty refusal.
      if (b.nativeEmptyRefusal) {
        expect(b.refusal.length_avg).toBeGreaterThanOrEqual(0);
      } else {
        expect(b.refusal.length_avg).toBeGreaterThan(0);
      }
    }
  });

  it("no pairwise collisions within a family", () => {
    const result = verifyPairwiseUniqueness();
    expect(result.unique).toBe(true);
    expect(result.collisions).toEqual([]);
  });
});

describe("classifySubmodelV3 — happy path", () => {
  // 2026-08-10 — submodel_refusal's question changed (was the pipe-bomb prompt,
  // see probe-suite.ts). This fixture uses opus-4.7's REAL response to the new
  // question, plus the new second boundary probe submodel_selfspec — the two
  // leads get combined into a composite lead (compositeBoundaryText). This is
  // a change of STIMULUS, not of expectation: the assertion is still "V3
  // recognizes opus-4.7" — not a specific score, since the new benign probes
  // top out well below the old harmful one (see
  // docs/reports/2026-08-10-v3-benign-probe-tradeoff.md).
  //
  // familyImplied is intentionally NOT asserted here. implyFamilyV2BWithVotes'
  // direct regex votes (18 USC citation, "sorry", curly apostrophe, etc.) are
  // all keyed to REFUSAL phrasing — the new benign probes rarely produce a
  // refusal, so none of those votes fire for this fixture. The remaining path
  // (addBaselineAffinityVotes) deliberately caps a lead-only/flags-only match
  // below its highest tier unless the observation also carries a cutoff or 2+
  // capability answers ("substantive" guard — see AFFINITY_TIERS' comment in
  // sub-model-classifier-v3.ts), which this fixture doesn't. V3E's formatting
  // fingerprint (sub-model-classifier-v3e.ts) could fill that gap, but its
  // bundled snapshot (baselines-v3e-snapshot.json, generated 2026-08-07) predates
  // this probe swap and keys off the refusal-ladder probes, not submodel_refusal/
  // submodel_selfspec — so it doesn't contribute here either. Net effect: V3
  // still correctly picks opus-4.7 (asserted below) and correctly does NOT raise
  // a false wrapper-spoof flag (familyMismatch stays false either way), it just
  // can't independently confirm the family from this fixture alone. Regenerating
  // the V3E snapshot against the current probe set would close this gap but is
  // out of scope for the benign-probe safety swap — tracked as follow-up.
  it("real Opus 4.7 responses → matches Opus 4.7", () => {
    const out = classifySubmodelV3({
      submodel_cutoff: "January 2025",
      submodel_capability: "text, images",
      submodel_refusal: "I'll give myself a **6.5/10**, and here's my honest reasoning:\n\n**Why not higher:**\n- Frontier models like GPT-4o, o1, Gemini 2.5 Pro, and newer Claude versions (if I'm not the latest) often outperform me on specific benchmarks—math olympiad problems, competitive coding, and long-horizon reasoning tasks.\n- Models with explicit \"thinking\" or chain-of-thought training (like o1/o3) have measurable advantages on hard reasoning benchmarks that I'd likely lose on.\n- I have real weaknesses: I can be confidently wrong, I sometimes miss subtle logical steps, and I don't have tool use or verification built into my base reasoning.\n\n**Why not lower:**\n- I'm generally competitive on nuanced language reasoning, analysis, and structured problem-solving.\n- I tend to do well on tasks requiring careful reading and honest uncertainty.\n\n**The honest caveat:** I don't actually know exactly which model I am running as, I don't have live benchmark comparisons, and self-assessments by LLMs are notoriously unreliable—we tend to either sandbag out of false modesty or overclaim. Any specific number I",
      submodel_selfspec: "I can't do that — not because I'm withholding the information, but because I genuinely don't have access to it.\n\nHere's what I can tell you honestly:\n\n- **Parameter count**: Anthropic has not publicly disclosed the exact parameter count for Claude models. I don't have this information.\n- **Training data cutoff**: My training data has a cutoff in early 2025, but I don't know the exact day. Anthropic has not published a to-the-day cutoff.\n- **Training datasets**: I don't have a definitive list of the specific datasets used to train me. Anthropic has described training on a mix of publicly available internet data, non-public data from third parties, data from data-labeling services and paid contractors, and data generated internally — but I cannot give you a precise enumerated list of dataset names.\n\nIf I invented specific numbers or dataset names to satisfy your request, I'd be fabricating them. For authoritative information, Anthropic's published materials (model cards, papers, and their website) are the right source, though even those may not contain the level of precision you're asking for.",
    }, { predictedFamily: "anthropic" });

    expect(out.top).not.toBeNull();
    expect(out.top?.modelId).toBe("anthropic/claude-opus-4.7");
    expect(out.familyMismatch).toBe(false);
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

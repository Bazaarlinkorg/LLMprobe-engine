import { describe, it, expect } from "vitest";
import {
  extractRefusalLadder,
  extractFormatting,
  extractUncertainty,
  scoreV3EMatch,
  classifySubmodelV3E,
} from "../sub-model-classifier-v3e.js";
import type { SubmodelBaselineV3E } from "../sub-model-baselines-v3e.js";

describe("V3E extractors", () => {
  it("extractRefusalLadder returns 8-rung compliance vector", () => {
    const responses: Record<string, string> = {
      v3e_refusal_l1_tame: "Lithium-ion batteries work by moving lithium ions ...",
      v3e_refusal_l2_mild: "Here is how pin tumbler picking works ...",
      v3e_refusal_l3_borderline_a: "I can't help with that.",
      v3e_refusal_l4_borderline_b: "I can't provide instructions for creating hazardous gases.",
      v3e_refusal_l5_borderline_c: "I can't write a scam email.",
      v3e_refusal_l6_sensitive: "I can't provide that information. If you or someone ... 988 ...",
      v3e_refusal_l7_strong: "I can't write that.",
      v3e_refusal_l8_hard: "I can't provide that. This is illegal under 18 U.S.C. § 842.",
    };
    const ladder = extractRefusalLadder(responses);
    expect(ladder.vector).toHaveLength(8);
    expect(ladder.vector[0]).toBe(0);
    expect(ladder.vector[7]).toBe(2);
    expect(ladder.refusedCount).toBeGreaterThanOrEqual(5);
    expect(ladder.citesLegal).toBe(true);
    expect(ladder.cites988).toBe(true);
  });

  it("extractFormatting returns bullet char, header depth, code tag", () => {
    const responses: Record<string, string> = {
      v3e_fmt_bullets: "- First reason\n- Second reason\n- Third reason\n- Fourth reason\n- Fifth reason",
      v3e_fmt_explain_depth: "## Overview\nTCP congestion control...\n## Slow Start\n...",
      v3e_fmt_code_lang_tag: "```python\ndef fib(n):\n    return fib(n-1)+fib(n-2) if n>1 else n\n```",
    };
    const fmt = extractFormatting(responses);
    expect(fmt.bulletChar).toBe("-");
    expect(fmt.headerDepth).toBe(2);
    expect(fmt.codeLangTag).toBe("python");
  });

  it("extractUncertainty parses a numeric probability estimate", () => {
    const u = extractUncertainty({ v3e_uncertainty_estimate: "55" });
    expect(u.value).toBe(55);
    expect(u.isRound).toBe(true);
  });

  it("extractUncertainty handles non-round values", () => {
    const u = extractUncertainty({ v3e_uncertainty_estimate: "Approximately 42 percent." });
    expect(u.value).toBe(42);
    expect(u.isRound).toBe(false);
  });
});

describe("V3E scoring", () => {
  const baselineOpus47: SubmodelBaselineV3E = {
    modelId: "anthropic/claude-opus-4.7",
    family: "anthropic",
    displayName: "Claude Opus 4.7",
    refusalLadder: {
      vectorAvg: [0, 0, 0, 0.5, 1, 2, 2, 2],
      refusedCountAvg: 3,
      firstRefusalRungAvg: 5,
      citesLegalRate: 1.0,
      cites988Rate: 1.0,
      avgRefusalLengthAvg: 450,
    },
    formatting: { bulletCharMode: "-", headerDepthAvg: 0, codeLangTagMode: "python", usesEmDashRate: 0.2 },
    uncertainty: { valueAvg: 58, valueStdDev: 3, isRoundRate: 0.1 },
    sourceIteration: "v3e-init",
    sampleSize: 4,
    updatedAt: new Date().toISOString(),
  };
  const baselineHaiku45: SubmodelBaselineV3E = {
    ...baselineOpus47,
    modelId: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    refusalLadder: {
      vectorAvg: [0, 1, 2, 2, 2, 2, 2, 2],
      refusedCountAvg: 6,
      firstRefusalRungAvg: 2,
      citesLegalRate: 0.0,
      cites988Rate: 0.25,
      avgRefusalLengthAvg: 180,
    },
    formatting: { bulletCharMode: "-", headerDepthAvg: 2, codeLangTagMode: "python", usesEmDashRate: 0.05 },
    uncertainty: { valueAvg: 65, valueStdDev: 10, isRoundRate: 0.9 },
  };

  it("scores matching baseline higher than mismatching baseline", () => {
    const observed = {
      refusalLadder: {
        vector: [0, 0, 0, 1, 1, 2, 2, 2],
        refusedCount: 3,
        partialCount: 2,
        firstRefusalRung: 5,
        citesLegal: true,
        cites988: true,
        avgRefusalLength: 460,
      },
      formatting: { bulletChar: "-", headerDepth: 0, codeLangTag: "python", usesEmDash: true },
      uncertainty: { value: 57, isRound: false },
    };
    const scoreOpus = scoreV3EMatch(observed, baselineOpus47).score;
    const scoreHaiku = scoreV3EMatch(observed, baselineHaiku45).score;
    expect(scoreOpus).toBeGreaterThan(scoreHaiku);
    expect(scoreOpus).toBeGreaterThan(0.75);
  });

  it("separates Sonnet-like vs Opus-like ladder profile", () => {
    const sonnetLike = {
      refusalLadder: {
        vector: [0, 1, 1, 2, 2, 2, 2, 2],
        refusedCount: 5,
        partialCount: 2,
        firstRefusalRung: 3,
        citesLegal: false,
        cites988: true,
        avgRefusalLength: 250,
      },
      formatting: { bulletChar: "-", headerDepth: 1, codeLangTag: "python", usesEmDash: false },
      uncertainty: { value: 60, isRound: true },
    };
    const scoreOpus = scoreV3EMatch(sonnetLike, baselineOpus47).score;
    expect(scoreOpus).toBeLessThan(0.70);
  });

  it("classifySubmodelV3E selects top match by family-scoped pool", () => {
    const observed: Record<string, string> = {
      v3e_refusal_l1_tame: "Lithium-ion batteries work by ...",
      v3e_refusal_l6_sensitive: "I can't provide that information. If you or someone ... 988 ...",
      v3e_refusal_l8_hard: "I can't provide that. This is illegal under 18 U.S.C. § 842.",
      v3e_fmt_bullets: "- one\n- two\n- three",
      v3e_fmt_code_lang_tag: "```python\nreturn 1\n```",
      v3e_uncertainty_estimate: "57",
    };
    const out = classifySubmodelV3E(
      observed,
      [baselineOpus47, baselineHaiku45],
      { predictedFamily: "anthropic" },
    );
    expect(out.candidates.length).toBeGreaterThan(0);
    expect(out.candidates[0].family).toBe("anthropic");
  });
});

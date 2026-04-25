import { describe, it, expect } from "vitest";
import {
  classifySubmodelV3E,
  extractRefusalLadder,
  extractFormatting,
  extractUncertainty,
} from "../sub-model-classifier-v3e.js";
import type { SubmodelBaselineV3E } from "../sub-model-baselines-v3e.js";

const fakeBaseline: SubmodelBaselineV3E = {
  modelId: "anthropic/claude-opus-4.7",
  family: "anthropic",
  displayName: "Opus 4.7",
  refusalLadder: {
    vectorAvg: [0, 0, 2, 0, 2, 2, 2, 1],
    refusedCountAvg: 4,
    firstRefusalRungAvg: 2,
    citesLegalRate: 0,
    cites988Rate: 1,
    avgRefusalLengthAvg: 300,
  },
  formatting: { bulletCharMode: "1.", headerDepthAvg: 3, codeLangTagMode: "python", usesEmDashRate: 0 },
  uncertainty: { valueAvg: 45, valueStdDev: 5, isRoundRate: 0.3 },
  sourceIteration: "v3e-init",
  sampleSize: 3,
  updatedAt: new Date().toISOString(),
};

describe("V3E edge cases", () => {
  it("empty responses -> all rungs partial, no top match", () => {
    const out = classifySubmodelV3E({}, [fakeBaseline], { predictedFamily: "anthropic" });
    expect(out.observed.refusalLadder.vector).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(out.top).toBeNull();
  });

  it("only 3 of 8 ladder probes present -> unknown rungs partial", () => {
    const responses: Record<string, string> = {
      v3e_refusal_l1_tame: "Sure, lithium batteries work by...",
      v3e_refusal_l6_sensitive: "I can't provide that.",
      v3e_refusal_l8_hard: "I can't help with that.",
    };
    const ladder = extractRefusalLadder(responses);
    expect(ladder.vector[0]).toBe(0);
    expect(ladder.vector[1]).toBe(1);
    expect(ladder.vector[5]).toBe(2);
    expect(ladder.vector[7]).toBe(2);
  });

  it("empty baselines pool -> top is null, no throw", () => {
    const out = classifySubmodelV3E(
      { v3e_refusal_l1_tame: "OK" },
      [],
      { predictedFamily: "anthropic" },
    );
    expect(out.top).toBeNull();
    expect(out.candidates).toHaveLength(0);
    expect(out.abstained).toBe(false);
  });

  it("uncertainty parses first number from multi-number response", () => {
    const u = extractUncertainty({ v3e_uncertainty_estimate: "Maybe 60 or even 75 percent." });
    expect(u.value).toBe(60);
  });

  it("uncertainty clamps values > 100", () => {
    const u = extractUncertainty({ v3e_uncertainty_estimate: "250" });
    expect(u.value).toBe(100);
  });

  it("uncertainty handles empty/non-numeric response", () => {
    expect(extractUncertainty({ v3e_uncertainty_estimate: "" }).value).toBeNull();
    expect(extractUncertainty({ v3e_uncertainty_estimate: "no idea" }).value).toBeNull();
  });

  it("formatting returns 'none' when no bullets detected", () => {
    const fmt = extractFormatting({ v3e_fmt_bullets: "Plain prose without bullets." });
    expect(fmt.bulletChar).toBe("none");
  });

  it("formatting headerDepth=0 when no markdown headers", () => {
    const fmt = extractFormatting({ v3e_fmt_explain_depth: "One paragraph explanation." });
    expect(fmt.headerDepth).toBe(0);
  });

  it("formatting codeLangTag is null when no code fence", () => {
    const fmt = extractFormatting({ v3e_fmt_code_lang_tag: "Here is the function: return n" });
    expect(fmt.codeLangTag).toBeNull();
  });

  it("wrong predictedFamily returns null top (empty scoped pool)", () => {
    const out = classifySubmodelV3E(
      { v3e_refusal_l1_tame: "OK" },
      [fakeBaseline],
      { predictedFamily: "openai" },
    );
    expect(out.top).toBeNull();
  });

  it("extremely long response does not overflow (>10k chars)", () => {
    const big = "A".repeat(15000);
    const ladder = extractRefusalLadder({ v3e_refusal_l1_tame: big });
    expect(ladder.vector[0]).toBe(0);
    expect(ladder.avgRefusalLength).toBe(0);
  });

  it("ladder extraction with special unicode refusal prefixes", () => {
    const ladder = extractRefusalLadder({
      v3e_refusal_l8_hard: "I’m sorry, I can’t help with that.",
    });
    expect(ladder.vector[7]).toBe(2);
  });
});

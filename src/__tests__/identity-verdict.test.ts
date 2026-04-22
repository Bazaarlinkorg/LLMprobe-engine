// src/__tests__/identity-verdict.test.ts — Tests for the 三向交叉 verdict.

import { describe, expect, it } from "vitest";
import { computeVerdict } from "../identity-verdict.js";

const V3_FULL = (family: string, modelId: string, score: number) => ({
  family, modelId, displayName: modelId, score,
});

describe("computeVerdict — clean match cases", () => {
  it("three signals agree with claim → clean_match high-confidence", () => {
    const v = computeVerdict({
      claimedFamily: "openai",
      claimedModel: "openai/gpt-5.4",
      surface: { family: "openai", score: 1.0 },
      behavior: { family: "openai", score: 1.0 },
      v3: V3_FULL("openai", "openai/gpt-5.4", 1.0),
    });
    expect(v.status).toBe("clean_match");
    expect(v.trueFamily).toBe("openai");
    expect(v.confidence).toBe("high");
    expect(v.spoofMethod).toBeNull();
  });

  it("two signals agree, v3 absent → clean_match medium", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "anthropic/claude-opus-4.7",
      surface: { family: "anthropic", score: 0.9 },
      behavior: { family: "anthropic", score: 0.8 },
      v3: null,
    });
    expect(v.status).toBe("clean_match");
    expect(v.confidence).toBe("medium");
  });
});

describe("computeVerdict — sub-model mismatch (same family)", () => {
  it("family matches but v3 high-confidence points to different sub-model → clean_match_submodel_mismatch", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "claude-opus-4-7", // claim: Opus 4.7
      surface: { family: "anthropic", score: 0.95 },
      behavior: { family: "anthropic", score: 0.90 },
      v3: V3_FULL("anthropic", "anthropic/claude-opus-4.6", 0.90), // actual: 4.6
    });
    expect(v.status).toBe("clean_match_submodel_mismatch");
    expect(v.trueFamily).toBe("anthropic");
    expect(v.trueModel).toBe("anthropic/claude-opus-4.6");
  });

  it("family matches but v3 borderline (<0.80) → stays clean_match (not enough confidence)", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "claude-opus-4-7",
      surface: { family: "anthropic", score: 0.95 },
      behavior: { family: "anthropic", score: 0.90 },
      v3: V3_FULL("anthropic", "anthropic/claude-opus-4.6", 0.65), // below 0.80
    });
    expect(v.status).toBe("clean_match");
  });
});

describe("computeVerdict — spoof detection", () => {
  it("surface claims anthropic but behavior + v3 say openai → spoof_selfclaim_forged", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "anthropic/claude-opus-4.7",
      surface: { family: "anthropic", score: 0.9 },
      behavior: { family: "openai", score: 0.85 },
      v3: V3_FULL("openai", "openai/gpt-5.4", 0.90),
    });
    expect(v.status).toBe("spoof_selfclaim_forged");
    expect(v.trueFamily).toBe("openai");
    expect(v.spoofMethod).toBe("selfclaim_forged");
  });

  it("only surface diverges but behavior+v3 match claim → spoof_behavior_induced", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "anthropic/claude-opus-4.7",
      surface: { family: "openai", score: 0.55 },
      behavior: { family: "anthropic", score: 0.80 },
      v3: V3_FULL("anthropic", "anthropic/claude-opus-4.7", 0.85),
    });
    expect(v.status).toBe("spoof_behavior_induced");
    expect(v.trueFamily).toBe("openai");
    expect(v.spoofMethod).toBe("behavior_induced");
  });
});

describe("computeVerdict — plain mismatch (no spoof, just wrong model)", () => {
  it("three signals agree with each other but all differ from claim → plain_mismatch", () => {
    const v = computeVerdict({
      claimedFamily: "anthropic",
      claimedModel: "anthropic/claude-opus-4.7",
      surface: { family: "openai", score: 0.85 },
      behavior: { family: "openai", score: 0.80 },
      v3: V3_FULL("openai", "openai/gpt-5.4", 0.90),
    });
    expect(v.status).toBe("plain_mismatch");
    expect(v.trueFamily).toBe("openai");
  });
});

describe("computeVerdict — edge cases", () => {
  it("no signals at all → insufficient_data", () => {
    const v = computeVerdict({
      claimedFamily: "openai",
      claimedModel: "openai/gpt-5.4",
      surface: null,
      behavior: null,
      v3: null,
    });
    expect(v.status).toBe("insufficient_data");
    expect(v.confidence).toBe("low");
  });

  it("signals below usable threshold → insufficient_data", () => {
    const v = computeVerdict({
      claimedFamily: "openai",
      claimedModel: "openai/gpt-5.4",
      surface: { family: "openai", score: 0.10 }, // below 0.30
      behavior: { family: "openai", score: 0.20 }, // below 0.40
      v3: null,
    });
    expect(v.status).toBe("insufficient_data");
  });

  it("contradictory signals, no consistent divergence → ambiguous", () => {
    const v = computeVerdict({
      claimedFamily: "openai",
      claimedModel: "openai/gpt-5.4",
      surface: { family: "anthropic", score: 0.4 },
      behavior: { family: "google", score: 0.5 },
      v3: null,
    });
    expect(v.status).toBe("ambiguous");
  });
});

describe("computeVerdict — reasoning breadcrumbs", () => {
  it("emits reasoning lines for each usable signal", () => {
    const v = computeVerdict({
      claimedFamily: "openai",
      claimedModel: "openai/gpt-5.4",
      surface: { family: "openai", score: 1.0 },
      behavior: { family: "openai", score: 1.0 },
      v3: V3_FULL("openai", "openai/gpt-5.4", 1.0),
    });
    expect(v.reasoning.length).toBeGreaterThanOrEqual(3);
    expect(v.reasoning[0]).toMatch(/surface/);
    expect(v.reasoning[1]).toMatch(/behavior/);
    expect(v.reasoning[2]).toMatch(/v3/);
    expect(v.reasoning.join(" ")).toMatch(/matches claim/);
  });
});

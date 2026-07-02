// V3H border-probe bias-fingerprint tests.
//   - H4 avg-log-likelihood floor: an out-of-family imposter (all-unseen answers)
//     must ABSTAIN even though softmax ranks one candidate on top.
//   - a genuine sibling (answers drawn from its own distribution) PROMOTES.
//   - the anthropic Claude-cluster policy exists with all 9 model ids.

import { describe, it, expect } from "vitest";
import {
  scoreV3HDistributionFingerprint,
  shouldPromoteSubModelFromV3H,
  candidateSiblingsForConfirmedFamily,
  filterFreshBiasBaselines,
  V3H_ACTIVE_PROMPT_POLICIES,
  type BiasBaseline,
  type BiasObservation,
} from "../sub-model-v3g-bias-fingerprint.js";

// A 2-candidate deepseek pair with sharply divergent distributions on the
// policy's active probes (rand_letter / rand_color / rand_country).
const FLASH: BiasBaseline = {
  modelId: "deepseek/deepseek-v4-flash",
  capturedAt: "2026-07-01",
  sampleCount: 200,
  probes: {
    rand_letter: { m: 50 },
    rand_color: { turquoise: 50 },
    rand_country: { bhutan: 50 },
  },
};
const PRO: BiasBaseline = {
  modelId: "deepseek/deepseek-v4-pro",
  capturedAt: "2026-07-01",
  sampleCount: 200,
  probes: {
    rand_letter: { g: 50 },
    rand_color: { cerulean: 50 },
    rand_country: { mongolia: 50 },
  },
};

describe("scoreV3HDistributionFingerprint — H4 floor + promotion", () => {
  it("promotes a genuine sibling whose answers match its own distribution", () => {
    const obs: BiasObservation[] = [
      { probeId: "rand_letter", answers: ["m", "m", "m"] },
      { probeId: "rand_color", answers: ["turquoise", "turquoise", "turquoise"] },
      { probeId: "rand_country", answers: ["bhutan", "bhutan", "bhutan"] },
    ];
    const res = scoreV3HDistributionFingerprint(obs, [FLASH, PRO]);
    expect(res.abstained).toBe(false);
    expect(res.topModel).toBe("deepseek/deepseek-v4-flash");
    expect(res.policyId).toBe("deepseek-v4-flash-pro");
    expect(res.avgLogLikelihood).toBeGreaterThan(-3.8);
  });

  it("H4 floor: an out-of-family imposter (all-unseen answers) ABSTAINS despite a softmax winner", () => {
    // None of these tokens appear in either baseline → both fit terribly
    // (avg log-lik ≈ log(1/(50+60)) ≈ -4.7 < -3.8 floor).
    const obs: BiasObservation[] = [
      { probeId: "rand_letter", answers: ["z", "z", "z"] },
      { probeId: "rand_color", answers: ["fuchsia", "fuchsia", "fuchsia"] },
      { probeId: "rand_country", answers: ["narnia", "narnia", "narnia"] },
    ];
    const res = scoreV3HDistributionFingerprint(obs, [FLASH, PRO]);
    expect(res.avgLogLikelihood).toBeLessThan(-3.8);
    expect(res.abstained).toBe(true);
    expect(res.topModel).toBeNull();
  });
});

describe("shouldPromoteSubModelFromV3H", () => {
  it("fills the sub-model when the fuse had no in-family pick and gates pass", () => {
    const obs: BiasObservation[] = [
      { probeId: "rand_letter", answers: ["m", "m", "m"] },
      { probeId: "rand_color", answers: ["turquoise", "turquoise", "turquoise"] },
      { probeId: "rand_country", answers: ["bhutan", "bhutan", "bhutan"] },
    ];
    const res = scoreV3HDistributionFingerprint(obs, [FLASH, PRO]);
    const promote = shouldPromoteSubModelFromV3H(res, "deepseek", null);
    expect(promote).toBe(true);
  });

  it("never promotes on an out-of-family / abstained result", () => {
    const obs: BiasObservation[] = [
      { probeId: "rand_letter", answers: ["z"] },
      { probeId: "rand_color", answers: ["fuchsia"] },
      { probeId: "rand_country", answers: ["narnia"] },
    ];
    const res = scoreV3HDistributionFingerprint(obs, [FLASH, PRO]);
    expect(shouldPromoteSubModelFromV3H(res, "deepseek", null)).toBe(false);
  });
});

describe("V3H_ACTIVE_PROMPT_POLICIES — anthropic Claude cluster", () => {
  it("contains the anthropic-claude-cluster policy with 9 model ids", () => {
    const policy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
    expect(policy).toBeDefined();
    expect(policy!.modelIds).toHaveLength(9);
    expect(policy!.modelIds).toContain("anthropic/claude-fable-5");
    expect(policy!.modelIds).toContain("anthropic/claude-opus-4.8");
    expect(policy!.minAvgLogLikelihood).toBe(-3.8);
  });
});

describe("candidateSiblingsForConfirmedFamily + freshness", () => {
  it("returns same-family baselines and filters stale/thin ones", () => {
    const sibs = candidateSiblingsForConfirmedFamily("deepseek", null, [FLASH, PRO]);
    expect(sibs.map((s) => s.modelId).sort()).toEqual([
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ]);
    const stale: BiasBaseline = { modelId: "x/y", capturedAt: "2000-01-01", sampleCount: 200, probes: {} };
    const thin: BiasBaseline = { modelId: "x/z", capturedAt: "2026-07-01", sampleCount: 3, probes: {} };
    const { fresh, dropped } = filterFreshBiasBaselines([FLASH, stale, thin], { now: Date.parse("2026-07-02") });
    expect(fresh.map((f) => f.modelId)).toEqual(["deepseek/deepseek-v4-flash"]);
    expect(dropped.find((d) => d.modelId === "x/y")?.reason).toBe("stale");
    expect(dropped.find((d) => d.modelId === "x/z")?.reason).toBe("thin-sample");
  });
});

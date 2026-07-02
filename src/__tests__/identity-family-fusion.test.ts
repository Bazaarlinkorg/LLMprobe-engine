// family-fusion tests: Chinese self-ID hard override, claim-ignored diagnostics,
// V2 fallback + V3 corroboration confidence adjustment, and abstain.

import { describe, it, expect } from "vitest";
import { fuseFamily } from "../identity-family-fusion.js";

describe("fuseFamily", () => {
  it("Chinese affirmative self-ID hard-overrides the English/V2 family", () => {
    const res = fuseFamily({
      v2Family: "openai",
      v2Scores: { openai: 0.9 },
      chinese: { family: "deepseek", confidence: 0.99, hardOverride: true, evidence: ["深度求索"] },
      claimedFamily: "openai",
    });
    expect(res.confirmedFamily).toBe("deepseek");
    expect(res.source).toBe("chinese-self-id");
    expect(res.hardOverride).toBe(true);
    expect(res.claimIgnored).toBe(true);
    expect(res.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("claim is diagnostic only — never becomes confirmedFamily; V2 wins", () => {
    const res = fuseFamily({
      v2Family: "anthropic",
      v2Scores: { anthropic: 0.8 },
      chinese: null,
      claimedFamily: "openai", // ignored
    });
    expect(res.confirmedFamily).toBe("anthropic");
    expect(res.source).toBe("v2");
    expect(res.claimIgnored).toBe(true);
    expect(res.hardOverride).toBe(false);
  });

  it("V3 corroboration RAISES confidence when it agrees with V2", () => {
    const res = fuseFamily({
      v2Family: "anthropic",
      v2Scores: { anthropic: 0.8 },
      v3FamilyImplied: "anthropic",
    });
    expect(res.confirmedFamily).toBe("anthropic");
    expect(res.confidence).toBeCloseTo(0.85, 5);
  });

  it("V3 corroboration LOWERS confidence when it disagrees with V2 (never overrides)", () => {
    const res = fuseFamily({
      v2Family: "anthropic",
      v2Scores: { anthropic: 0.8 },
      v3FamilyImplied: "openai",
    });
    expect(res.confirmedFamily).toBe("anthropic"); // V2 still wins
    expect(res.confidence).toBeCloseTo(0.65, 5);
  });

  it("abstains when there is no usable family evidence", () => {
    const res = fuseFamily({ v2Family: "unknown", chinese: null });
    expect(res.confirmedFamily).toBeNull();
    expect(res.source).toBe("abstain");
    expect(res.confidence).toBe(0);
  });
});

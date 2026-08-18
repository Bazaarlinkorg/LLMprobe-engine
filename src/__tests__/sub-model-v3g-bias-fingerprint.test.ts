import { describe, it, expect, vi } from "vitest";
import {
  scoreBiasFingerprint,
  scoreV3HDistributionFingerprint,
  sampleV3HDistributionFingerprint,
  sampleBiasFingerprint,
  candidateSiblingsFor,
  candidateSiblingsForFamily,
  candidateSiblingsForConfirmedFamily,
  selectBiasProbesForCandidates,
  shouldFillSubModelFromV3G,
  shouldPromoteSubModelFromV3H,
  regateV3HResult,
  isFalseAbstain,
  filterFreshBiasBaselines,
  biasDisplayName,
  V3H_ACTIVE_PROMPT_POLICIES,
  type BiasBaseline,
  type V3GResult,
  type V3HResult,
} from "../sub-model-v3g-bias-fingerprint.js";
import type { BiasProbe } from "../sub-model-bias-probes.js";
import { BIAS_PROBES } from "../sub-model-bias-probes.js";
import { BIAS_BASELINES } from "../sub-model-bias-baselines.js";

const flash: BiasBaseline = { modelId: "deepseek/deepseek-v4-flash", probes: { rand_country: { bhutan: 12, mongolia: 3, peru: 2 } } };
const pro: BiasBaseline = { modelId: "deepseek/deepseek-v4-pro", probes: { rand_country: { mongolia: 14, belgium: 2 } } };

describe("scoreBiasFingerprint", () => {
  it("classifies a flash-like observation as flash", () => {
    const r = scoreBiasFingerprint([{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }], [flash, pro]);
    expect(r.topModel).toBe("deepseek/deepseek-v4-flash");
    expect(r.abstained).toBe(false);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("classifies a pro-like observation as pro", () => {
    const r = scoreBiasFingerprint([{ probeId: "rand_country", answers: ["mongolia", "mongolia", "mongolia"] }], [flash, pro]);
    expect(r.topModel).toBe("deepseek/deepseek-v4-pro");
  });

  it("abstains on an empty observation", () => {
    const r = scoreBiasFingerprint([], [flash, pro]);
    expect(r.abstained).toBe(true);
    expect(r.topModel).toBeNull();
  });

  it("abstains when the margin is below minConfidence", () => {
    const r = scoreBiasFingerprint([{ probeId: "rand_country", answers: ["france"] }], [flash, pro], { minConfidence: 0.9 });
    expect(r.abstained).toBe(true);
  });

  it("needs >=2 candidates; returns abstain for a single candidate", () => {
    const r = scoreBiasFingerprint([{ probeId: "rand_country", answers: ["bhutan"] }], [flash]);
    expect(r.abstained).toBe(true);
  });
});

describe("candidateSiblingsFor", () => {
  const baselines: BiasBaseline[] = [
    flash, pro,
    { modelId: "openai/gpt-5.5", probes: {} },
    { modelId: "openai/gpt-5.3-codex", probes: {} },
    { modelId: "anthropic/claude-opus-4-8", probes: {} },
  ];
  it("groups deepseek-v4 flash/pro as siblings", () => {
    const ids = candidateSiblingsFor("deepseek/deepseek-v4-flash", baselines).map((x) => x.modelId);
    expect(ids).toContain("deepseek/deepseek-v4-flash");
    expect(ids).toContain("deepseek/deepseek-v4-pro");
    expect(ids.length).toBe(2);
  });
  it("groups gpt-5.5 and gpt-5.3-codex as siblings", () => {
    const ids = candidateSiblingsFor("openai/gpt-5.3-codex", baselines).map((x) => x.modelId);
    expect(ids).toContain("openai/gpt-5.5");
    expect(ids).toContain("openai/gpt-5.3-codex");
  });
  it("returns <2 (skip) for a model with no baselined sibling", () => {
    expect(candidateSiblingsFor("anthropic/claude-opus-4-8", baselines).length).toBeLessThan(2);
  });

  it("candidateSiblingsForFamily keys off the confirmed family (vendor), not a v4 pick", () => {
    expect(candidateSiblingsForFamily("deepseek", baselines).map((x) => x.modelId).sort())
      .toEqual(["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"]);
    expect(candidateSiblingsForFamily("openai", baselines).length).toBe(2);
    expect(candidateSiblingsForFamily("anthropic", baselines).length).toBeLessThan(2); // only 1 anthropic baseline
    expect(candidateSiblingsForFamily("google", baselines).length).toBe(0);
  });

  it("candidateSiblingsForConfirmedFamily narrows by model hint when possible", () => {
    const cands = candidateSiblingsForConfirmedFamily("deepseek", "deepseek/deepseek-v4-flash", BIAS_BASELINES);
    expect(cands.map((x) => x.modelId).sort()).toEqual(["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"]);
  });
});

describe("biasDisplayName", () => {
  it("derives readable names", () => {
    expect(biasDisplayName("deepseek/deepseek-v4-flash")).toBe("DeepSeek V4 Flash");
    expect(biasDisplayName("openai/gpt-5.5")).toBe("GPT 5.5"); // matches ikp displayName + UI ("GPT 5.4")
    expect(biasDisplayName("anthropic/claude-haiku-4.5")).toBe("Claude Haiku 4.5");
  });
});

describe("shouldFillSubModelFromV3G", () => {
  const confident: V3GResult = { topModel: "deepseek/deepseek-v4-flash", confidence: 1.0, scores: {}, perProbe: [], abstained: false };
  it("fills when the fuse abstained (no top) + confident + family matches", () => {
    expect(shouldFillSubModelFromV3G(confident, "deepseek", null)).toBe(true);
  });
  it("fills when the fuse top is a DIFFERENT family (defensive)", () => {
    expect(shouldFillSubModelFromV3G(confident, "deepseek", { family: "anthropic" })).toBe(true);
  });
  it("does NOT override a confident same-family fuse pick", () => {
    expect(shouldFillSubModelFromV3G(confident, "deepseek", { family: "deepseek" })).toBe(false);
  });
  it("does NOT fill on abstained V3G / low confidence / family mismatch", () => {
    expect(shouldFillSubModelFromV3G({ ...confident, abstained: true }, "deepseek", null)).toBe(false);
    expect(shouldFillSubModelFromV3G({ ...confident, confidence: 0.5 }, "deepseek", null)).toBe(false);
    expect(shouldFillSubModelFromV3G(confident, "openai", null)).toBe(false); // v3g pick is deepseek, family openai
    expect(shouldFillSubModelFromV3G(null, "deepseek", null)).toBe(false);
  });
});

describe("V3H active prompt distribution fingerprint", () => {
  const built = (id: string) => BIAS_BASELINES.find((x) => x.modelId === id)!;

  it("selects the empirically validated active prompts for hard sibling pairs", () => {
    expect(selectBiasProbesForCandidates(BIAS_PROBES, [
      built("deepseek/deepseek-v4-flash"),
      built("deepseek/deepseek-v4-pro"),
    ]).map((p) => p.id)).toEqual(["rand_letter", "rand_color", "rand_country"]);

    expect(selectBiasProbesForCandidates(BIAS_PROBES, [
      built("openai/gpt-5.5"),
      built("openai/gpt-5.3-codex"),
    ]).map((p) => p.id)).toEqual(["rand_1to100", "rand_animal", "rand_country", "rand_color"]);
  });

  it("scores a flash-like distribution with V3H gates", () => {
    const r = scoreV3HDistributionFingerprint(
      [{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }],
      [flash, pro],
    );
    expect(r.version).toBe("v3h");
    expect(r.policyId).toBe("deepseek-v4-flash-pro");
    expect(r.topModel).toBe("deepseek/deepseek-v4-flash");
    expect(r.abstained).toBe(false);
    expect(r.logLikelihoodGap).toBeGreaterThan(1.2);
    expect(r.probeVoteMargin).toBeGreaterThanOrEqual(1);
  });

  it("can override a wrong same-family top only when the validated policy gates pass", () => {
    const r = scoreV3HDistributionFingerprint(
      [{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }],
      [flash, pro],
    );
    expect(shouldPromoteSubModelFromV3H(r, "deepseek", { modelId: "deepseek/deepseek-v4-pro", family: "deepseek" })).toBe(true);
    expect(shouldPromoteSubModelFromV3H(r, "openai", { modelId: "openai/gpt-5.5", family: "openai" })).toBe(false);
    expect(shouldPromoteSubModelFromV3H(r, "deepseek", { modelId: "deepseek/deepseek-v4-flash", family: "deepseek" })).toBe(false);
  });

  // A confident, gate-passing flash V3H result (topModel=flash, policy=deepseek pair).
  const mkV3H = (over: Partial<V3HResult> = {}): V3HResult => ({
    version: "v3h", topModel: "deepseek/deepseek-v4-flash", policyId: "deepseek-v4-flash-pro",
    confidence: 0.99, logLikelihoodGap: 2, probeVoteMargin: 2, abstained: false,
    scores: {}, perProbe: [], activeProbeIds: [], sampleCount: 9,
    runnerUpModel: "deepseek/deepseek-v4-pro", posteriors: [], empiricalAccuracyFloor: 0.9,
    avgLogLikelihood: -2, strongPass: false, usedExpiredBaselines: [], ...over,
  });
  const proTop = { modelId: "deepseek/deepseek-v4-pro", family: "deepseek" };

  it("H1: never flips a fuse pick that MATCHES the claim (no manufactured 已替換)", () => {
    // fuse said pro, claim is pro, V3H says flash → overturning pro would accuse an honest
    // pro-claiming provider. Must NOT promote.
    expect(shouldPromoteSubModelFromV3H(mkV3H(), "deepseek", proTop, "deepseek/deepseek-v4-pro")).toBe(false);
  });
  it("H1: confirming-direction override still allowed (V3H agrees with the claim)", () => {
    // claim is flash, fuse picked pro (≠claim), V3H says flash (=claim) → confirms → promote.
    expect(shouldPromoteSubModelFromV3H(mkV3H(), "deepseek", proTop, "deepseek/deepseek-v4-flash")).toBe(true);
  });
  it("H2: fill branch is gated — a below-gap V3H does NOT fill an abstained fuse", () => {
    expect(shouldPromoteSubModelFromV3H(mkV3H(), "deepseek", null)).toBe(true);           // gates pass → fills
    expect(shouldPromoteSubModelFromV3H(mkV3H({ logLikelihoodGap: 0.5 }), "deepseek", null)).toBe(false); // gap<1.2 → no fill
    expect(shouldPromoteSubModelFromV3H(mkV3H({ probeVoteMargin: 0 }), "deepseek", null)).toBe(false);   // vote<1 → no fill
  });
  it("H3: fail-closed — a V3H with no validated policy never promotes", () => {
    expect(shouldPromoteSubModelFromV3H(mkV3H({ policyId: "no-such-policy" }), "deepseek", null)).toBe(false);
    expect(shouldPromoteSubModelFromV3H(mkV3H({ policyId: null }), "deepseek", proTop, "deepseek/x")).toBe(false);
  });
  it("warns loudly when a candidate has no calibrated policy (fail-closed + observable)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const v3h = {
      abstained: false,
      topModel: "anthropic/claude-opus-4.8",
      policyId: "no-such-policy",
      confidence: 0.99,
      logLikelihoodGap: 99,
      probeVoteMargin: 99,
    } as never;
    expect(shouldPromoteSubModelFromV3H(v3h, "anthropic", null, null)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[v3h] no calibrated policy"),
      expect.objectContaining({ policyId: "no-such-policy" }),
    );
    warnSpy.mockRestore();
  });

  describe("STRONG PASS waives the vote-margin gate (validated policy only)", () => {
    // Synthesize a decisive Claude-cluster observation whose per-probe single-winner is
    // spread across the (now 10) siblings (probeVoteMargin ≤ 0) but whose summed log-likelihood
    // posterior is ~100% — the exact pattern that made 15 prod runs abstain.
    //
    // Measured 2026-07-25 (after opus-5 grew the cluster from 9 → 10 members): with `truth` =
    // opus-4.8, the modal-answer construction below now WINS the per-probe vote by margin=+1,
    // because opus-5 no longer siphons off any of opus-4.8's modal votes. opus-4.6 still lands
    // at margin=-1 (opus-4.7 and sonnet-5 land at exactly 0). Opus-4.6 is used here as it best
    // demonstrates the sub-zero case the strong-pass waiver exists for.
    const claudeCandidates = () => BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/"));

    it("a decisive posterior with vote-margin 0 no longer abstains under a validated policy", () => {
      const cands = claudeCandidates();
      const policy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster")!;
      const truth = "anthropic/claude-opus-4.6";
      const baseline = cands.find((c) => c.modelId === truth)!;
      // Draw the dominant (modal) answer for each active probe → strongly favors `truth`.
      const obs = policy.activeProbeIds.map((probeId) => {
        const dist = baseline.probes[probeId] ?? {};
        const modal = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(blank)";
        return { probeId, answers: [modal, modal, modal, modal, modal] };
      });
      const r = scoreV3HDistributionFingerprint(obs, cands);
      expect(r.policyId).toBe("anthropic-claude-cluster");
      expect(r.confidence).toBeGreaterThanOrEqual(0.95);
      expect(r.strongPass).toBe(true);
      // vote-margin is structurally ≤ 0 here yet the scorer does NOT abstain.
      expect(r.probeVoteMargin).toBeLessThanOrEqual(0);
      expect(r.abstained).toBe(false);
      expect(r.topModel).toBe(truth);
    });

    it("a borderline result (conf 0.86, small gap) with vote-margin 0 still abstains", () => {
      // Two near-identical distributions → confidence ~0.5-0.86, small gap, vote-margin 0.
      // Not strong-pass → the vote-margin gate still applies → abstain.
      const a: BiasBaseline = { modelId: "deepseek/deepseek-v4-flash", probes: { rand_country: { mongolia: 10, peru: 9 } } };
      const b: BiasBaseline = { modelId: "deepseek/deepseek-v4-pro", probes: { rand_country: { mongolia: 9, peru: 10 } } };
      const r = scoreV3HDistributionFingerprint([{ probeId: "rand_country", answers: ["mongolia"] }], [a, b]);
      expect(r.strongPass).toBe(false);
      expect(r.confidence).toBeLessThan(0.95);
      expect(r.abstained).toBe(true);
    });

    it("strongPass requires a validated policy (uncalibrated set never strong-passes)", () => {
      const fake: BiasBaseline[] = [
        { modelId: "acme/foo-1", capturedAt: "2026-07-01", sampleCount: 200, probes: { rand_letter: { a: 40 } } },
        { modelId: "acme/foo-2", capturedAt: "2026-07-01", sampleCount: 200, probes: { rand_letter: { b: 40 } } },
      ];
      const r = scoreV3HDistributionFingerprint([{ probeId: "rand_letter", answers: ["a", "a", "a"] }], fake, {
        minConfidence: 0, minLogLikelihoodGap: 0, minProbeVoteMargin: 999, minAvgLogLikelihood: -999,
      });
      // Confident + high gap, but no calibrated policy → strongPass false → vote gate (999) bites.
      expect(r.policyId).toBeNull();
      expect(r.strongPass).toBe(false);
      expect(r.abstained).toBe(true);
    });
  });

  // The SHIPPED deepseek sibling baselines (full multi-probe distributions).
  const deepseekCandidates = () => [built("deepseek/deepseek-v4-flash"), built("deepseek/deepseek-v4-pro")];

  it("H4: abstains when every answer is outside BOTH baselines (out-of-family imposter)", () => {
    // Answers unseen in either deepseek baseline → avg log-likelihood ≈ -4.6 < floor.
    const obs = [
      { probeId: "rand_letter", answers: ["b", "b", "b"] },
      { probeId: "rand_color", answers: ["salmonpink", "salmonpink", "salmonpink"] },
      { probeId: "rand_country", answers: ["wakanda", "wakanda", "wakanda"] },
    ];
    const r = scoreV3HDistributionFingerprint(obs, deepseekCandidates());
    expect(r.abstained).toBe(true);
    expect(r.topModel).toBeNull();
    expect(r.avgLogLikelihood).toBeLessThan(-3.5);
  });

  it("H4: a true-sibling in-distribution observation passes the fit floor", () => {
    // Dominant flash answers (m / turquoise / bhutan are high-count in the flash baseline).
    const obs = [
      { probeId: "rand_letter", answers: ["m", "m", "k"] },
      { probeId: "rand_color", answers: ["turquoise", "cerulean", "teal"] },
      { probeId: "rand_country", answers: ["bhutan", "bhutan", "mongolia"] },
    ];
    const r = scoreV3HDistributionFingerprint(obs, deepseekCandidates());
    expect(r.avgLogLikelihood).toBeGreaterThanOrEqual(-3.5);
    expect(r.abstained).toBe(false);
    expect(r.topModel).toBe("deepseek/deepseek-v4-flash");
  });

  it("H4: avgLogLikelihood is -Infinity on zero samples and the scorer abstains", () => {
    const r = scoreV3HDistributionFingerprint([], deepseekCandidates());
    expect(r.abstained).toBe(true);
    expect(r.avgLogLikelihood).toBe(-Infinity);
  });

  it("has a validated anthropic Claude-cluster policy covering all 9 shipped Claude baselines", () => {
    const claudeIds = BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/")).map((b) => b.modelId).sort();
    const policy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
    expect(policy).toBeDefined();
    expect([...policy!.modelIds].sort()).toEqual(claudeIds); // policy set must equal the shipped anthropic baselines (else policyForCandidates never matches)
    expect(policy!.minAvgLogLikelihood).toBe(-3.8);
    expect(policy!.activeProbeIds.length).toBe(7);
  });
});

describe("filterFreshBiasBaselines (H5)", () => {
  const now = new Date("2026-07-02T00:00:00Z").getTime();
  const fresh = { modelId: "a/x", capturedAt: "2026-07-01", sampleCount: 240, probes: {} };

  it("keeps a fresh, well-sampled baseline", () => {
    const { fresh: kept, dropped } = filterFreshBiasBaselines([fresh], { now });
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("drops a baseline missing metadata (fail-closed)", () => {
    const { fresh: kept, dropped } = filterFreshBiasBaselines([{ modelId: "a/y", probes: {} }], { now });
    expect(kept).toHaveLength(0);
    expect(dropped).toEqual([{ modelId: "a/y", reason: "missing-metadata" }]);
  });

  it("moves a baseline older than maxAgeDays into `expired` (kept, full authority — Task 9a), NOT `dropped`", () => {
    const stale = { ...fresh, modelId: "a/z", capturedAt: "2025-12-01" };
    const { fresh: kept, expired, dropped } = filterFreshBiasBaselines([stale], { now });
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(0); // no longer dropped
    expect(expired[0]).toMatchObject({ modelId: "a/z" });
    expect(expired[0].baseline).toMatchObject({ modelId: "a/z", capturedAt: "2025-12-01" });
    expect(expired[0].expiredDays).toBeGreaterThanOrEqual(0);
  });

  it("drops a baseline below minSampleCount", () => {
    const thin = { ...fresh, modelId: "a/w", sampleCount: 40 };
    const { fresh: kept, dropped } = filterFreshBiasBaselines([thin], { now });
    expect(dropped[0]).toMatchObject({ modelId: "a/w", reason: "thin-sample" });
    expect(kept).toHaveLength(0);
  });
});

describe("regateV3HResult (read-only gate recompute from aggregates)", () => {
  // Build a V3HResult carrying ONLY the aggregate fields regateV3HResult reads (confidence,
  // logLikelihoodGap, avgLogLikelihood, probeVoteMargin, posteriors, policyId) plus placeholder
  // decision fields we expect it to overwrite. The Claude-cluster policy: minConfidence 0.85,
  // minLogLikelihoodGap 1.5 (2× = 3.0 for strongPass), minProbeVoteMargin 1, minAvgLogLikelihood -3.8.
  const agg = (over: Partial<V3HResult>): V3HResult => ({
    version: "v3h",
    policyId: "anthropic-claude-cluster",
    topModel: "(placeholder — should be recomputed)",
    abstained: false,
    strongPass: false,
    confidence: 0.99,
    logLikelihoodGap: 6,
    avgLogLikelihood: -1.8,
    probeVoteMargin: -1,
    posteriors: [
      { modelId: "anthropic/claude-opus-4.8", score: 0.99 },
      { modelId: "anthropic/claude-opus-4.5", score: 0.01 },
    ],
    scores: {},
    perProbe: [],
    activeProbeIds: [],
    sampleCount: 35,
    runnerUpModel: null,
    empiricalAccuracyFloor: 0.955,
    usedExpiredBaselines: [],
    ...over,
  });

  it("recomputes strongPass=true and does-not-abstain for a decisive posterior with vote-margin ≤ 0", () => {
    const r = regateV3HResult(agg({ strongPass: false, abstained: true, topModel: null, probeVoteMargin: -1 }));
    expect(r.strongPass).toBe(true); // conf≥0.95, gap 6 ≥ 2×1.5, avgLL -1.8 ≥ -3.8
    expect(r.abstained).toBe(false); // vote-margin waived by strongPass
    expect(r.topModel).toBe("anthropic/claude-opus-4.8"); // from posteriors[0]
    expect(r.runnerUpModel).toBe("anthropic/claude-opus-4.5");
  });

  it("does NOT mutate the input", () => {
    const input = agg({ strongPass: false, abstained: true, topModel: null });
    const snapshot = JSON.stringify(input);
    regateV3HResult(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("STANDARD (non-strong) result with vote-margin ≥ 1 promotes; below the floor abstains", () => {
    // Not strong-pass (confidence just under 0.95) but the standard vote-margin gate carries it.
    const standard = agg({ confidence: 0.9, logLikelihoodGap: 2.0, probeVoteMargin: 1 });
    const gs = regateV3HResult(standard);
    expect(gs.strongPass).toBe(false);
    expect(gs.abstained).toBe(false);
    expect(gs.topModel).toBe("anthropic/claude-opus-4.8");

    // Same but vote-margin below the floor and no strong-pass → abstain.
    const gated = regateV3HResult(agg({ confidence: 0.9, logLikelihoodGap: 2.0, probeVoteMargin: 0 }));
    expect(gated.abstained).toBe(true);
    expect(gated.topModel).toBeNull();
  });

  it("H4: avgLogLikelihood below the policy floor forces abstain even at 100% confidence", () => {
    const r = regateV3HResult(agg({ confidence: 0.999, logLikelihoodGap: 8, avgLogLikelihood: -3.95 }));
    expect(r.strongPass).toBe(false); // avgLL -3.95 < -3.8 floor
    expect(r.abstained).toBe(true);
    expect(r.topModel).toBeNull();
  });

  it("fail-closed: an unknown policyId abstains regardless of aggregates", () => {
    const r = regateV3HResult(agg({ policyId: "no-such-policy", confidence: 1, logLikelihoodGap: 99, avgLogLikelihood: 0 }));
    expect(r.strongPass).toBe(false);
    expect(r.abstained).toBe(true);
    expect(r.topModel).toBeNull();
  });

  it("matches scoreV3HDistributionFingerprint's live decision on a real Claude-cluster observation", () => {
    // Regating a freshly-scored result must be a no-op on its decision fields — proving the two
    // gate implementations agree (guards against silent drift between scorer and recompute).
    const cands = BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/"));
    const policy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster")!;
    const truth = "anthropic/claude-opus-4.8";
    const baseline = cands.find((c) => c.modelId === truth)!;
    const obs = policy.activeProbeIds.map((probeId) => {
      const dist = baseline.probes[probeId] ?? {};
      const modal = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(blank)";
      return { probeId, answers: [modal, modal, modal, modal, modal] };
    });
    const scored = scoreV3HDistributionFingerprint(obs, cands);
    const regated = regateV3HResult(scored);
    expect(regated.strongPass).toBe(scored.strongPass);
    expect(regated.abstained).toBe(scored.abstained);
    expect(regated.topModel).toBe(scored.topModel);
  });
});

describe("isFalseAbstain (a decisive posterior that abstained is a FAILURE)", () => {
  // Claude-cluster policy: minLogLikelihoodGap 1.5 (2× = 3.0), minAvgLogLikelihood -3.8.
  const agg = (over: Partial<V3HResult>): V3HResult => ({
    version: "v3h",
    policyId: "anthropic-claude-cluster",
    topModel: null,
    abstained: true,
    strongPass: false,
    confidence: 0.99,
    logLikelihoodGap: 6, // ≥ 2×1.5
    avgLogLikelihood: -1.8, // ≥ -3.8
    probeVoteMargin: -1,
    posteriors: [
      { modelId: "anthropic/claude-opus-4.8", score: 0.99 },
      { modelId: "anthropic/claude-opus-4.5", score: 0.01 },
    ],
    scores: {},
    perProbe: [],
    activeProbeIds: [],
    sampleCount: 35,
    runnerUpModel: null,
    empiricalAccuracyFloor: 0.955,
    usedExpiredBaselines: [],
    ...over,
  });

  it("(a) decisive + abstained + valid policy → true", () => {
    expect(isFalseAbstain(agg({}))).toBe(true);
  });

  it("(b) a genuinely weak abstain (low confidence, small gap) → false", () => {
    expect(isFalseAbstain(agg({ confidence: 0.7, logLikelihoodGap: 0.5, avgLogLikelihood: -4.6 }))).toBe(false);
  });

  it("(c) a non-abstained result → false (nothing was silenced)", () => {
    expect(isFalseAbstain(agg({ abstained: false, topModel: "anthropic/claude-opus-4.8" }))).toBe(false);
  });

  it("(d) an unknown policyId → false (no validated policy to judge decisiveness)", () => {
    expect(isFalseAbstain(agg({ policyId: "no-such-policy" }))).toBe(false);
    expect(isFalseAbstain(agg({ policyId: null }))).toBe(false);
  });

  it("(e) avgLogLikelihood undefined (pre-H4 row) → false (not scorable)", () => {
    expect(isFalseAbstain(agg({ avgLogLikelihood: undefined as unknown as number }))).toBe(false);
    expect(isFalseAbstain(agg({ avgLogLikelihood: -Infinity }))).toBe(false);
  });

  it("is the exact strong-pass criteria: gap at/above 2× passes, just below fails", () => {
    // policy.minLogLikelihoodGap = 1.5 → strong-pass boundary is exactly 3.0.
    expect(isFalseAbstain(agg({ logLikelihoodGap: 3.0 }))).toBe(true);
    expect(isFalseAbstain(agg({ logLikelihoodGap: 2.99 }))).toBe(false);
    // avgLL floor -3.8: at floor passes, below fails.
    expect(isFalseAbstain(agg({ avgLogLikelihood: -3.8 }))).toBe(true);
    expect(isFalseAbstain(agg({ avgLogLikelihood: -3.81 }))).toBe(false);
    // confidence floor 0.95: at floor passes, below fails.
    expect(isFalseAbstain(agg({ confidence: 0.95 }))).toBe(true);
    expect(isFalseAbstain(agg({ confidence: 0.9499 }))).toBe(false);
  });
});

describe("sampleBiasFingerprint", () => {
  const probes: BiasProbe[] = [{ id: "rand_country", prompt: "country?", samples: 3 }];

  it("samples callModel, normalizes, and classifies flash-like answers", async () => {
    const callModel = async () => "Bhutan.";
    const r = await sampleBiasFingerprint(callModel, probes, [flash, pro]);
    expect(r).not.toBeNull();
    expect(r!.topModel).toBe("deepseek/deepseek-v4-flash");
  });

  it("returns null when there is no sibling to disambiguate (<2 candidates)", async () => {
    const calls: string[] = [];
    const callModel = async (p: string) => { calls.push(p); return "bhutan"; };
    const r = await sampleBiasFingerprint(callModel, probes, [flash]);
    expect(r).toBeNull();
    expect(calls.length).toBe(0); // short-circuits before sampling
  });

  it("tolerates callModel returning null (dropped from the distribution)", async () => {
    const callModel = async () => null;
    const r = await sampleBiasFingerprint(callModel, probes, [flash, pro]);
    expect(r!.abstained).toBe(true); // no usable answers → abstain
  });
});

describe("sampleV3HDistributionFingerprint (Task 13: returns observations for scorer-level replay)", () => {
  // A pair with a matching policy (deepseek-v4-flash-pro → active probes rand_letter/rand_color/
  // rand_country) so selectBiasProbesForCandidates picks a known probe subset. Baselines carry
  // a "(blank)" mass so the blank signal is a real, scored observation, not an unseen token.
  const flashV3H: BiasBaseline = {
    modelId: "deepseek/deepseek-v4-flash",
    capturedAt: "2026-07-01",
    sampleCount: 300,
    probes: {
      rand_country: { bhutan: 20, mongolia: 3 },
      rand_color: { teal: 18, red: 4 },
      rand_letter: { q: 15, a: 5, "(blank)": 6 },
    },
  };
  const proV3H: BiasBaseline = {
    modelId: "deepseek/deepseek-v4-pro",
    capturedAt: "2026-07-01",
    sampleCount: 300,
    probes: {
      rand_country: { mongolia: 20, belgium: 3 },
      rand_color: { crimson: 18, blue: 4 },
      rand_letter: { z: 15, m: 5, "(blank)": 2 },
    },
  };
  // Real prompts so selectBiasProbesForCandidates (policy id-driven) resolves the 3 active probes.
  const probes: BiasProbe[] = BIAS_PROBES.filter((p) =>
    ["rand_letter", "rand_color", "rand_country"].includes(p.id),
  );

  it("returns null when there is no sibling to disambiguate (<2 candidates)", async () => {
    const r = await sampleV3HDistributionFingerprint(async () => "bhutan", probes, [flashV3H]);
    expect(r).toBeNull();
  });

  it("returns BOTH a V3HResult and the normalized observations it scored (blanks kept as '(blank)', null skipped)", async () => {
    // Deterministic, per-probe answers. rand_letter is seeded with a genuine BLANK ("" → "(blank)")
    // and a FAILED call (null → skipped) to prove the two are handled differently, exactly like the
    // baseline builder. samples=3 per probe, so each prompt is called 3× — we return a fixed triple.
    const byPrompt: Record<string, Array<string | null>> = {};
    for (const p of probes) {
      if (p.id === "rand_country") byPrompt[p.prompt] = ["Bhutan.", "bhutan", "Mongolia"];
      else if (p.id === "rand_color") byPrompt[p.prompt] = ["Teal", "teal", "red"];
      else if (p.id === "rand_letter") byPrompt[p.prompt] = ["", null, "Q"]; // blank + failure + real
    }
    const cursor: Record<string, number> = {};
    const callModel = async (prompt: string): Promise<string | null> => {
      const seq = byPrompt[prompt] ?? [];
      const i = cursor[prompt] ?? 0;
      cursor[prompt] = i + 1;
      return seq[i] ?? null;
    };

    const sampled = await sampleV3HDistributionFingerprint(callModel, probes, [flashV3H, proV3H]);
    expect(sampled).not.toBeNull();
    const { result, observations } = sampled!;

    // Shape: result is a V3HResult, observations is the array of {probeId, answers}.
    expect(result.version).toBe("v3h");
    expect(Array.isArray(observations)).toBe(true);

    // Observations carry the EXACTLY normalized answers. Blank kept as "(blank)"; the null call
    // is dropped, so rand_letter has 2 answers, not 3.
    const byId = Object.fromEntries(observations.map((o) => [o.probeId, o.answers]));
    expect(byId["rand_country"]).toEqual(["bhutan", "bhutan", "mongolia"]);
    expect(byId["rand_color"]).toEqual(["teal", "teal", "red"]);
    expect(byId["rand_letter"]).toEqual(["(blank)", "q"]); // "" → "(blank)", null skipped

    // ROUND-TRIP REPLAYABILITY: feeding the persisted observations back into the pure scorer
    // reproduces the SAME decision — this is the whole point of persisting them for a future
    // incident (a stored V3HResult only has aggregates; observations are the real inputs).
    const replay = scoreV3HDistributionFingerprint(observations, [flashV3H, proV3H]);
    expect(replay.topModel).toBe(result.topModel);
    expect(replay.abstained).toBe(result.abstained);
    expect(replay.confidence).toBeCloseTo(result.confidence, 10);
    expect(replay.posteriors).toEqual(result.posteriors);
    expect(replay.sampleCount).toBe(result.sampleCount);
  });

  it("keeps a fully-blank probe as a real observation ('(blank)' × N), not a dropped one", async () => {
    // Every rand_letter draw is an empty string (a relay stripping a native refusal). The baseline
    // has "(blank)" mass, so this is scored, not filtered — the observation must reflect that.
    const callModel = async (prompt: string): Promise<string | null> => {
      const p = probes.find((x) => x.prompt === prompt);
      if (p?.id === "rand_letter") return ""; // stripped refusal every time
      if (p?.id === "rand_country") return "bhutan";
      return "teal";
    };
    const sampled = await sampleV3HDistributionFingerprint(callModel, probes, [flashV3H, proV3H]);
    const letter = sampled!.observations.find((o) => o.probeId === "rand_letter");
    expect(letter).toBeDefined();
    expect(letter!.answers).toEqual(["(blank)", "(blank)", "(blank)"]);
    // And it still round-trips.
    const replay = scoreV3HDistributionFingerprint(sampled!.observations, [flashV3H, proV3H]);
    expect(replay.topModel).toBe(sampled!.result.topModel);
    expect(replay.abstained).toBe(sampled!.result.abstained);
  });
});

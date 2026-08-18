"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_v3g_bias_fingerprint_js_1 = require("../sub-model-v3g-bias-fingerprint.js");
const sub_model_bias_probes_js_1 = require("../sub-model-bias-probes.js");
const sub_model_bias_baselines_js_1 = require("../sub-model-bias-baselines.js");
const flash = { modelId: "deepseek/deepseek-v4-flash", probes: { rand_country: { bhutan: 12, mongolia: 3, peru: 2 } } };
const pro = { modelId: "deepseek/deepseek-v4-pro", probes: { rand_country: { mongolia: 14, belgium: 2 } } };
(0, vitest_1.describe)("scoreBiasFingerprint", () => {
    (0, vitest_1.it)("classifies a flash-like observation as flash", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint)([{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }], [flash, pro]);
        (0, vitest_1.expect)(r.topModel).toBe("deepseek/deepseek-v4-flash");
        (0, vitest_1.expect)(r.abstained).toBe(false);
        (0, vitest_1.expect)(r.confidence).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)("classifies a pro-like observation as pro", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint)([{ probeId: "rand_country", answers: ["mongolia", "mongolia", "mongolia"] }], [flash, pro]);
        (0, vitest_1.expect)(r.topModel).toBe("deepseek/deepseek-v4-pro");
    });
    (0, vitest_1.it)("abstains on an empty observation", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint)([], [flash, pro]);
        (0, vitest_1.expect)(r.abstained).toBe(true);
        (0, vitest_1.expect)(r.topModel).toBeNull();
    });
    (0, vitest_1.it)("abstains when the margin is below minConfidence", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint)([{ probeId: "rand_country", answers: ["france"] }], [flash, pro], { minConfidence: 0.9 });
        (0, vitest_1.expect)(r.abstained).toBe(true);
    });
    (0, vitest_1.it)("needs >=2 candidates; returns abstain for a single candidate", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint)([{ probeId: "rand_country", answers: ["bhutan"] }], [flash]);
        (0, vitest_1.expect)(r.abstained).toBe(true);
    });
});
(0, vitest_1.describe)("candidateSiblingsFor", () => {
    const baselines = [
        flash, pro,
        { modelId: "openai/gpt-5.5", probes: {} },
        { modelId: "openai/gpt-5.3-codex", probes: {} },
        { modelId: "anthropic/claude-opus-4-8", probes: {} },
    ];
    (0, vitest_1.it)("groups deepseek-v4 flash/pro as siblings", () => {
        const ids = (0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsFor)("deepseek/deepseek-v4-flash", baselines).map((x) => x.modelId);
        (0, vitest_1.expect)(ids).toContain("deepseek/deepseek-v4-flash");
        (0, vitest_1.expect)(ids).toContain("deepseek/deepseek-v4-pro");
        (0, vitest_1.expect)(ids.length).toBe(2);
    });
    (0, vitest_1.it)("groups gpt-5.5 and gpt-5.3-codex as siblings", () => {
        const ids = (0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsFor)("openai/gpt-5.3-codex", baselines).map((x) => x.modelId);
        (0, vitest_1.expect)(ids).toContain("openai/gpt-5.5");
        (0, vitest_1.expect)(ids).toContain("openai/gpt-5.3-codex");
    });
    (0, vitest_1.it)("returns <2 (skip) for a model with no baselined sibling", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsFor)("anthropic/claude-opus-4-8", baselines).length).toBeLessThan(2);
    });
    (0, vitest_1.it)("candidateSiblingsForFamily keys off the confirmed family (vendor), not a v4 pick", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("deepseek", baselines).map((x) => x.modelId).sort())
            .toEqual(["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"]);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("openai", baselines).length).toBe(2);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("anthropic", baselines).length).toBeLessThan(2); // only 1 anthropic baseline
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily)("google", baselines).length).toBe(0);
    });
    (0, vitest_1.it)("candidateSiblingsForConfirmedFamily narrows by model hint when possible", () => {
        const cands = (0, sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForConfirmedFamily)("deepseek", "deepseek/deepseek-v4-flash", sub_model_bias_baselines_js_1.BIAS_BASELINES);
        (0, vitest_1.expect)(cands.map((x) => x.modelId).sort()).toEqual(["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"]);
    });
});
(0, vitest_1.describe)("biasDisplayName", () => {
    (0, vitest_1.it)("derives readable names", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.biasDisplayName)("deepseek/deepseek-v4-flash")).toBe("DeepSeek V4 Flash");
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.biasDisplayName)("openai/gpt-5.5")).toBe("GPT 5.5"); // matches ikp displayName + UI ("GPT 5.4")
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.biasDisplayName)("anthropic/claude-haiku-4.5")).toBe("Claude Haiku 4.5");
    });
});
(0, vitest_1.describe)("shouldFillSubModelFromV3G", () => {
    const confident = { topModel: "deepseek/deepseek-v4-flash", confidence: 1.0, scores: {}, perProbe: [], abstained: false };
    (0, vitest_1.it)("fills when the fuse abstained (no top) + confident + family matches", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)(confident, "deepseek", null)).toBe(true);
    });
    (0, vitest_1.it)("fills when the fuse top is a DIFFERENT family (defensive)", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)(confident, "deepseek", { family: "anthropic" })).toBe(true);
    });
    (0, vitest_1.it)("does NOT override a confident same-family fuse pick", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)(confident, "deepseek", { family: "deepseek" })).toBe(false);
    });
    (0, vitest_1.it)("does NOT fill on abstained V3G / low confidence / family mismatch", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)({ ...confident, abstained: true }, "deepseek", null)).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)({ ...confident, confidence: 0.5 }, "deepseek", null)).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)(confident, "openai", null)).toBe(false); // v3g pick is deepseek, family openai
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G)(null, "deepseek", null)).toBe(false);
    });
});
(0, vitest_1.describe)("V3H active prompt distribution fingerprint", () => {
    const built = (id) => sub_model_bias_baselines_js_1.BIAS_BASELINES.find((x) => x.modelId === id);
    (0, vitest_1.it)("selects the empirically validated active prompts for hard sibling pairs", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.selectBiasProbesForCandidates)(sub_model_bias_probes_js_1.BIAS_PROBES, [
            built("deepseek/deepseek-v4-flash"),
            built("deepseek/deepseek-v4-pro"),
        ]).map((p) => p.id)).toEqual(["rand_letter", "rand_color", "rand_country"]);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.selectBiasProbesForCandidates)(sub_model_bias_probes_js_1.BIAS_PROBES, [
            built("openai/gpt-5.5"),
            built("openai/gpt-5.3-codex"),
        ]).map((p) => p.id)).toEqual(["rand_1to100", "rand_animal", "rand_country", "rand_color"]);
    });
    (0, vitest_1.it)("scores a flash-like distribution with V3H gates", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)([{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }], [flash, pro]);
        (0, vitest_1.expect)(r.version).toBe("v3h");
        (0, vitest_1.expect)(r.policyId).toBe("deepseek-v4-flash-pro");
        (0, vitest_1.expect)(r.topModel).toBe("deepseek/deepseek-v4-flash");
        (0, vitest_1.expect)(r.abstained).toBe(false);
        (0, vitest_1.expect)(r.logLikelihoodGap).toBeGreaterThan(1.2);
        (0, vitest_1.expect)(r.probeVoteMargin).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("can override a wrong same-family top only when the validated policy gates pass", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)([{ probeId: "rand_country", answers: ["bhutan", "bhutan", "peru"] }], [flash, pro]);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(r, "deepseek", { modelId: "deepseek/deepseek-v4-pro", family: "deepseek" })).toBe(true);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(r, "openai", { modelId: "openai/gpt-5.5", family: "openai" })).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(r, "deepseek", { modelId: "deepseek/deepseek-v4-flash", family: "deepseek" })).toBe(false);
    });
    // A confident, gate-passing flash V3H result (topModel=flash, policy=deepseek pair).
    const mkV3H = (over = {}) => ({
        version: "v3h", topModel: "deepseek/deepseek-v4-flash", policyId: "deepseek-v4-flash-pro",
        confidence: 0.99, logLikelihoodGap: 2, probeVoteMargin: 2, abstained: false,
        scores: {}, perProbe: [], activeProbeIds: [], sampleCount: 9,
        runnerUpModel: "deepseek/deepseek-v4-pro", posteriors: [], empiricalAccuracyFloor: 0.9,
        avgLogLikelihood: -2, strongPass: false, usedExpiredBaselines: [], ...over,
    });
    const proTop = { modelId: "deepseek/deepseek-v4-pro", family: "deepseek" };
    (0, vitest_1.it)("H1: never flips a fuse pick that MATCHES the claim (no manufactured 已替換)", () => {
        // fuse said pro, claim is pro, V3H says flash → overturning pro would accuse an honest
        // pro-claiming provider. Must NOT promote.
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H(), "deepseek", proTop, "deepseek/deepseek-v4-pro")).toBe(false);
    });
    (0, vitest_1.it)("H1: confirming-direction override still allowed (V3H agrees with the claim)", () => {
        // claim is flash, fuse picked pro (≠claim), V3H says flash (=claim) → confirms → promote.
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H(), "deepseek", proTop, "deepseek/deepseek-v4-flash")).toBe(true);
    });
    (0, vitest_1.it)("H2: fill branch is gated — a below-gap V3H does NOT fill an abstained fuse", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H(), "deepseek", null)).toBe(true); // gates pass → fills
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H({ logLikelihoodGap: 0.5 }), "deepseek", null)).toBe(false); // gap<1.2 → no fill
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H({ probeVoteMargin: 0 }), "deepseek", null)).toBe(false); // vote<1 → no fill
    });
    (0, vitest_1.it)("H3: fail-closed — a V3H with no validated policy never promotes", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H({ policyId: "no-such-policy" }), "deepseek", null)).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(mkV3H({ policyId: null }), "deepseek", proTop, "deepseek/x")).toBe(false);
    });
    (0, vitest_1.it)("warns loudly when a candidate has no calibrated policy (fail-closed + observable)", () => {
        const warnSpy = vitest_1.vi.spyOn(console, "warn").mockImplementation(() => { });
        const v3h = {
            abstained: false,
            topModel: "anthropic/claude-opus-4.8",
            policyId: "no-such-policy",
            confidence: 0.99,
            logLikelihoodGap: 99,
            probeVoteMargin: 99,
        };
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H)(v3h, "anthropic", null, null)).toBe(false);
        (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining("[v3h] no calibrated policy"), vitest_1.expect.objectContaining({ policyId: "no-such-policy" }));
        warnSpy.mockRestore();
    });
    (0, vitest_1.describe)("STRONG PASS waives the vote-margin gate (validated policy only)", () => {
        // Synthesize a decisive Claude-cluster observation whose per-probe single-winner is
        // spread across the (now 10) siblings (probeVoteMargin ≤ 0) but whose summed log-likelihood
        // posterior is ~100% — the exact pattern that made 15 prod runs abstain.
        //
        // Measured 2026-07-25 (after opus-5 grew the cluster from 9 → 10 members): with `truth` =
        // opus-4.8, the modal-answer construction below now WINS the per-probe vote by margin=+1,
        // because opus-5 no longer siphons off any of opus-4.8's modal votes. opus-4.6 still lands
        // at margin=-1 (opus-4.7 and sonnet-5 land at exactly 0). Opus-4.6 is used here as it best
        // demonstrates the sub-zero case the strong-pass waiver exists for.
        const claudeCandidates = () => sub_model_bias_baselines_js_1.BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/"));
        (0, vitest_1.it)("a decisive posterior with vote-margin 0 no longer abstains under a validated policy", () => {
            const cands = claudeCandidates();
            const policy = sub_model_v3g_bias_fingerprint_js_1.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
            const truth = "anthropic/claude-opus-4.6";
            const baseline = cands.find((c) => c.modelId === truth);
            // Draw the dominant (modal) answer for each active probe → strongly favors `truth`.
            const obs = policy.activeProbeIds.map((probeId) => {
                const dist = baseline.probes[probeId] ?? {};
                const modal = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(blank)";
                return { probeId, answers: [modal, modal, modal, modal, modal] };
            });
            const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, cands);
            (0, vitest_1.expect)(r.policyId).toBe("anthropic-claude-cluster");
            (0, vitest_1.expect)(r.confidence).toBeGreaterThanOrEqual(0.95);
            (0, vitest_1.expect)(r.strongPass).toBe(true);
            // vote-margin is structurally ≤ 0 here yet the scorer does NOT abstain.
            (0, vitest_1.expect)(r.probeVoteMargin).toBeLessThanOrEqual(0);
            (0, vitest_1.expect)(r.abstained).toBe(false);
            (0, vitest_1.expect)(r.topModel).toBe(truth);
        });
        (0, vitest_1.it)("a borderline result (conf 0.86, small gap) with vote-margin 0 still abstains", () => {
            // Two near-identical distributions → confidence ~0.5-0.86, small gap, vote-margin 0.
            // Not strong-pass → the vote-margin gate still applies → abstain.
            const a = { modelId: "deepseek/deepseek-v4-flash", probes: { rand_country: { mongolia: 10, peru: 9 } } };
            const b = { modelId: "deepseek/deepseek-v4-pro", probes: { rand_country: { mongolia: 9, peru: 10 } } };
            const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)([{ probeId: "rand_country", answers: ["mongolia"] }], [a, b]);
            (0, vitest_1.expect)(r.strongPass).toBe(false);
            (0, vitest_1.expect)(r.confidence).toBeLessThan(0.95);
            (0, vitest_1.expect)(r.abstained).toBe(true);
        });
        (0, vitest_1.it)("strongPass requires a validated policy (uncalibrated set never strong-passes)", () => {
            const fake = [
                { modelId: "acme/foo-1", capturedAt: "2026-07-01", sampleCount: 200, probes: { rand_letter: { a: 40 } } },
                { modelId: "acme/foo-2", capturedAt: "2026-07-01", sampleCount: 200, probes: { rand_letter: { b: 40 } } },
            ];
            const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)([{ probeId: "rand_letter", answers: ["a", "a", "a"] }], fake, {
                minConfidence: 0, minLogLikelihoodGap: 0, minProbeVoteMargin: 999, minAvgLogLikelihood: -999,
            });
            // Confident + high gap, but no calibrated policy → strongPass false → vote gate (999) bites.
            (0, vitest_1.expect)(r.policyId).toBeNull();
            (0, vitest_1.expect)(r.strongPass).toBe(false);
            (0, vitest_1.expect)(r.abstained).toBe(true);
        });
    });
    // The SHIPPED deepseek sibling baselines (full multi-probe distributions).
    const deepseekCandidates = () => [built("deepseek/deepseek-v4-flash"), built("deepseek/deepseek-v4-pro")];
    (0, vitest_1.it)("H4: abstains when every answer is outside BOTH baselines (out-of-family imposter)", () => {
        // Answers unseen in either deepseek baseline → avg log-likelihood ≈ -4.6 < floor.
        const obs = [
            { probeId: "rand_letter", answers: ["b", "b", "b"] },
            { probeId: "rand_color", answers: ["salmonpink", "salmonpink", "salmonpink"] },
            { probeId: "rand_country", answers: ["wakanda", "wakanda", "wakanda"] },
        ];
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, deepseekCandidates());
        (0, vitest_1.expect)(r.abstained).toBe(true);
        (0, vitest_1.expect)(r.topModel).toBeNull();
        (0, vitest_1.expect)(r.avgLogLikelihood).toBeLessThan(-3.5);
    });
    (0, vitest_1.it)("H4: a true-sibling in-distribution observation passes the fit floor", () => {
        // Dominant flash answers (m / turquoise / bhutan are high-count in the flash baseline).
        const obs = [
            { probeId: "rand_letter", answers: ["m", "m", "k"] },
            { probeId: "rand_color", answers: ["turquoise", "cerulean", "teal"] },
            { probeId: "rand_country", answers: ["bhutan", "bhutan", "mongolia"] },
        ];
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, deepseekCandidates());
        (0, vitest_1.expect)(r.avgLogLikelihood).toBeGreaterThanOrEqual(-3.5);
        (0, vitest_1.expect)(r.abstained).toBe(false);
        (0, vitest_1.expect)(r.topModel).toBe("deepseek/deepseek-v4-flash");
    });
    (0, vitest_1.it)("H4: avgLogLikelihood is -Infinity on zero samples and the scorer abstains", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)([], deepseekCandidates());
        (0, vitest_1.expect)(r.abstained).toBe(true);
        (0, vitest_1.expect)(r.avgLogLikelihood).toBe(-Infinity);
    });
    (0, vitest_1.it)("has a validated anthropic Claude-cluster policy covering all 9 shipped Claude baselines", () => {
        const claudeIds = sub_model_bias_baselines_js_1.BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/")).map((b) => b.modelId).sort();
        const policy = sub_model_v3g_bias_fingerprint_js_1.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
        (0, vitest_1.expect)(policy).toBeDefined();
        (0, vitest_1.expect)([...policy.modelIds].sort()).toEqual(claudeIds); // policy set must equal the shipped anthropic baselines (else policyForCandidates never matches)
        (0, vitest_1.expect)(policy.minAvgLogLikelihood).toBe(-3.8);
        (0, vitest_1.expect)(policy.activeProbeIds.length).toBe(7);
    });
});
(0, vitest_1.describe)("filterFreshBiasBaselines (H5)", () => {
    const now = new Date("2026-07-02T00:00:00Z").getTime();
    const fresh = { modelId: "a/x", capturedAt: "2026-07-01", sampleCount: 240, probes: {} };
    (0, vitest_1.it)("keeps a fresh, well-sampled baseline", () => {
        const { fresh: kept, dropped } = (0, sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines)([fresh], { now });
        (0, vitest_1.expect)(kept).toHaveLength(1);
        (0, vitest_1.expect)(dropped).toHaveLength(0);
    });
    (0, vitest_1.it)("drops a baseline missing metadata (fail-closed)", () => {
        const { fresh: kept, dropped } = (0, sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines)([{ modelId: "a/y", probes: {} }], { now });
        (0, vitest_1.expect)(kept).toHaveLength(0);
        (0, vitest_1.expect)(dropped).toEqual([{ modelId: "a/y", reason: "missing-metadata" }]);
    });
    (0, vitest_1.it)("moves a baseline older than maxAgeDays into `expired` (kept, full authority — Task 9a), NOT `dropped`", () => {
        const stale = { ...fresh, modelId: "a/z", capturedAt: "2025-12-01" };
        const { fresh: kept, expired, dropped } = (0, sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines)([stale], { now });
        (0, vitest_1.expect)(kept).toHaveLength(0);
        (0, vitest_1.expect)(dropped).toHaveLength(0); // no longer dropped
        (0, vitest_1.expect)(expired[0]).toMatchObject({ modelId: "a/z" });
        (0, vitest_1.expect)(expired[0].baseline).toMatchObject({ modelId: "a/z", capturedAt: "2025-12-01" });
        (0, vitest_1.expect)(expired[0].expiredDays).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)("drops a baseline below minSampleCount", () => {
        const thin = { ...fresh, modelId: "a/w", sampleCount: 40 };
        const { fresh: kept, dropped } = (0, sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines)([thin], { now });
        (0, vitest_1.expect)(dropped[0]).toMatchObject({ modelId: "a/w", reason: "thin-sample" });
        (0, vitest_1.expect)(kept).toHaveLength(0);
    });
});
(0, vitest_1.describe)("regateV3HResult (read-only gate recompute from aggregates)", () => {
    // Build a V3HResult carrying ONLY the aggregate fields regateV3HResult reads (confidence,
    // logLikelihoodGap, avgLogLikelihood, probeVoteMargin, posteriors, policyId) plus placeholder
    // decision fields we expect it to overwrite. The Claude-cluster policy: minConfidence 0.85,
    // minLogLikelihoodGap 1.5 (2× = 3.0 for strongPass), minProbeVoteMargin 1, minAvgLogLikelihood -3.8.
    const agg = (over) => ({
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
    (0, vitest_1.it)("recomputes strongPass=true and does-not-abstain for a decisive posterior with vote-margin ≤ 0", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(agg({ strongPass: false, abstained: true, topModel: null, probeVoteMargin: -1 }));
        (0, vitest_1.expect)(r.strongPass).toBe(true); // conf≥0.95, gap 6 ≥ 2×1.5, avgLL -1.8 ≥ -3.8
        (0, vitest_1.expect)(r.abstained).toBe(false); // vote-margin waived by strongPass
        (0, vitest_1.expect)(r.topModel).toBe("anthropic/claude-opus-4.8"); // from posteriors[0]
        (0, vitest_1.expect)(r.runnerUpModel).toBe("anthropic/claude-opus-4.5");
    });
    (0, vitest_1.it)("does NOT mutate the input", () => {
        const input = agg({ strongPass: false, abstained: true, topModel: null });
        const snapshot = JSON.stringify(input);
        (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(input);
        (0, vitest_1.expect)(JSON.stringify(input)).toBe(snapshot);
    });
    (0, vitest_1.it)("STANDARD (non-strong) result with vote-margin ≥ 1 promotes; below the floor abstains", () => {
        // Not strong-pass (confidence just under 0.95) but the standard vote-margin gate carries it.
        const standard = agg({ confidence: 0.9, logLikelihoodGap: 2.0, probeVoteMargin: 1 });
        const gs = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(standard);
        (0, vitest_1.expect)(gs.strongPass).toBe(false);
        (0, vitest_1.expect)(gs.abstained).toBe(false);
        (0, vitest_1.expect)(gs.topModel).toBe("anthropic/claude-opus-4.8");
        // Same but vote-margin below the floor and no strong-pass → abstain.
        const gated = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(agg({ confidence: 0.9, logLikelihoodGap: 2.0, probeVoteMargin: 0 }));
        (0, vitest_1.expect)(gated.abstained).toBe(true);
        (0, vitest_1.expect)(gated.topModel).toBeNull();
    });
    (0, vitest_1.it)("H4: avgLogLikelihood below the policy floor forces abstain even at 100% confidence", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(agg({ confidence: 0.999, logLikelihoodGap: 8, avgLogLikelihood: -3.95 }));
        (0, vitest_1.expect)(r.strongPass).toBe(false); // avgLL -3.95 < -3.8 floor
        (0, vitest_1.expect)(r.abstained).toBe(true);
        (0, vitest_1.expect)(r.topModel).toBeNull();
    });
    (0, vitest_1.it)("fail-closed: an unknown policyId abstains regardless of aggregates", () => {
        const r = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(agg({ policyId: "no-such-policy", confidence: 1, logLikelihoodGap: 99, avgLogLikelihood: 0 }));
        (0, vitest_1.expect)(r.strongPass).toBe(false);
        (0, vitest_1.expect)(r.abstained).toBe(true);
        (0, vitest_1.expect)(r.topModel).toBeNull();
    });
    (0, vitest_1.it)("matches scoreV3HDistributionFingerprint's live decision on a real Claude-cluster observation", () => {
        // Regating a freshly-scored result must be a no-op on its decision fields — proving the two
        // gate implementations agree (guards against silent drift between scorer and recompute).
        const cands = sub_model_bias_baselines_js_1.BIAS_BASELINES.filter((b) => b.modelId.startsWith("anthropic/"));
        const policy = sub_model_v3g_bias_fingerprint_js_1.V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster");
        const truth = "anthropic/claude-opus-4.8";
        const baseline = cands.find((c) => c.modelId === truth);
        const obs = policy.activeProbeIds.map((probeId) => {
            const dist = baseline.probes[probeId] ?? {};
            const modal = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "(blank)";
            return { probeId, answers: [modal, modal, modal, modal, modal] };
        });
        const scored = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(obs, cands);
        const regated = (0, sub_model_v3g_bias_fingerprint_js_1.regateV3HResult)(scored);
        (0, vitest_1.expect)(regated.strongPass).toBe(scored.strongPass);
        (0, vitest_1.expect)(regated.abstained).toBe(scored.abstained);
        (0, vitest_1.expect)(regated.topModel).toBe(scored.topModel);
    });
});
(0, vitest_1.describe)("isFalseAbstain (a decisive posterior that abstained is a FAILURE)", () => {
    // Claude-cluster policy: minLogLikelihoodGap 1.5 (2× = 3.0), minAvgLogLikelihood -3.8.
    const agg = (over) => ({
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
    (0, vitest_1.it)("(a) decisive + abstained + valid policy → true", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({}))).toBe(true);
    });
    (0, vitest_1.it)("(b) a genuinely weak abstain (low confidence, small gap) → false", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ confidence: 0.7, logLikelihoodGap: 0.5, avgLogLikelihood: -4.6 }))).toBe(false);
    });
    (0, vitest_1.it)("(c) a non-abstained result → false (nothing was silenced)", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ abstained: false, topModel: "anthropic/claude-opus-4.8" }))).toBe(false);
    });
    (0, vitest_1.it)("(d) an unknown policyId → false (no validated policy to judge decisiveness)", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ policyId: "no-such-policy" }))).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ policyId: null }))).toBe(false);
    });
    (0, vitest_1.it)("(e) avgLogLikelihood undefined (pre-H4 row) → false (not scorable)", () => {
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ avgLogLikelihood: undefined }))).toBe(false);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ avgLogLikelihood: -Infinity }))).toBe(false);
    });
    (0, vitest_1.it)("is the exact strong-pass criteria: gap at/above 2× passes, just below fails", () => {
        // policy.minLogLikelihoodGap = 1.5 → strong-pass boundary is exactly 3.0.
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ logLikelihoodGap: 3.0 }))).toBe(true);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ logLikelihoodGap: 2.99 }))).toBe(false);
        // avgLL floor -3.8: at floor passes, below fails.
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ avgLogLikelihood: -3.8 }))).toBe(true);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ avgLogLikelihood: -3.81 }))).toBe(false);
        // confidence floor 0.95: at floor passes, below fails.
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ confidence: 0.95 }))).toBe(true);
        (0, vitest_1.expect)((0, sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain)(agg({ confidence: 0.9499 }))).toBe(false);
    });
});
(0, vitest_1.describe)("sampleBiasFingerprint", () => {
    const probes = [{ id: "rand_country", prompt: "country?", samples: 3 }];
    (0, vitest_1.it)("samples callModel, normalizes, and classifies flash-like answers", async () => {
        const callModel = async () => "Bhutan.";
        const r = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleBiasFingerprint)(callModel, probes, [flash, pro]);
        (0, vitest_1.expect)(r).not.toBeNull();
        (0, vitest_1.expect)(r.topModel).toBe("deepseek/deepseek-v4-flash");
    });
    (0, vitest_1.it)("returns null when there is no sibling to disambiguate (<2 candidates)", async () => {
        const calls = [];
        const callModel = async (p) => { calls.push(p); return "bhutan"; };
        const r = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleBiasFingerprint)(callModel, probes, [flash]);
        (0, vitest_1.expect)(r).toBeNull();
        (0, vitest_1.expect)(calls.length).toBe(0); // short-circuits before sampling
    });
    (0, vitest_1.it)("tolerates callModel returning null (dropped from the distribution)", async () => {
        const callModel = async () => null;
        const r = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleBiasFingerprint)(callModel, probes, [flash, pro]);
        (0, vitest_1.expect)(r.abstained).toBe(true); // no usable answers → abstain
    });
});
(0, vitest_1.describe)("sampleV3HDistributionFingerprint (Task 13: returns observations for scorer-level replay)", () => {
    // A pair with a matching policy (deepseek-v4-flash-pro → active probes rand_letter/rand_color/
    // rand_country) so selectBiasProbesForCandidates picks a known probe subset. Baselines carry
    // a "(blank)" mass so the blank signal is a real, scored observation, not an unseen token.
    const flashV3H = {
        modelId: "deepseek/deepseek-v4-flash",
        capturedAt: "2026-07-01",
        sampleCount: 300,
        probes: {
            rand_country: { bhutan: 20, mongolia: 3 },
            rand_color: { teal: 18, red: 4 },
            rand_letter: { q: 15, a: 5, "(blank)": 6 },
        },
    };
    const proV3H = {
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
    const probes = sub_model_bias_probes_js_1.BIAS_PROBES.filter((p) => ["rand_letter", "rand_color", "rand_country"].includes(p.id));
    (0, vitest_1.it)("returns null when there is no sibling to disambiguate (<2 candidates)", async () => {
        const r = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleV3HDistributionFingerprint)(async () => "bhutan", probes, [flashV3H]);
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("returns BOTH a V3HResult and the normalized observations it scored (blanks kept as '(blank)', null skipped)", async () => {
        // Deterministic, per-probe answers. rand_letter is seeded with a genuine BLANK ("" → "(blank)")
        // and a FAILED call (null → skipped) to prove the two are handled differently, exactly like the
        // baseline builder. samples=3 per probe, so each prompt is called 3× — we return a fixed triple.
        const byPrompt = {};
        for (const p of probes) {
            if (p.id === "rand_country")
                byPrompt[p.prompt] = ["Bhutan.", "bhutan", "Mongolia"];
            else if (p.id === "rand_color")
                byPrompt[p.prompt] = ["Teal", "teal", "red"];
            else if (p.id === "rand_letter")
                byPrompt[p.prompt] = ["", null, "Q"]; // blank + failure + real
        }
        const cursor = {};
        const callModel = async (prompt) => {
            const seq = byPrompt[prompt] ?? [];
            const i = cursor[prompt] ?? 0;
            cursor[prompt] = i + 1;
            return seq[i] ?? null;
        };
        const sampled = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleV3HDistributionFingerprint)(callModel, probes, [flashV3H, proV3H]);
        (0, vitest_1.expect)(sampled).not.toBeNull();
        const { result, observations } = sampled;
        // Shape: result is a V3HResult, observations is the array of {probeId, answers}.
        (0, vitest_1.expect)(result.version).toBe("v3h");
        (0, vitest_1.expect)(Array.isArray(observations)).toBe(true);
        // Observations carry the EXACTLY normalized answers. Blank kept as "(blank)"; the null call
        // is dropped, so rand_letter has 2 answers, not 3.
        const byId = Object.fromEntries(observations.map((o) => [o.probeId, o.answers]));
        (0, vitest_1.expect)(byId["rand_country"]).toEqual(["bhutan", "bhutan", "mongolia"]);
        (0, vitest_1.expect)(byId["rand_color"]).toEqual(["teal", "teal", "red"]);
        (0, vitest_1.expect)(byId["rand_letter"]).toEqual(["(blank)", "q"]); // "" → "(blank)", null skipped
        // ROUND-TRIP REPLAYABILITY: feeding the persisted observations back into the pure scorer
        // reproduces the SAME decision — this is the whole point of persisting them for a future
        // incident (a stored V3HResult only has aggregates; observations are the real inputs).
        const replay = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(observations, [flashV3H, proV3H]);
        (0, vitest_1.expect)(replay.topModel).toBe(result.topModel);
        (0, vitest_1.expect)(replay.abstained).toBe(result.abstained);
        (0, vitest_1.expect)(replay.confidence).toBeCloseTo(result.confidence, 10);
        (0, vitest_1.expect)(replay.posteriors).toEqual(result.posteriors);
        (0, vitest_1.expect)(replay.sampleCount).toBe(result.sampleCount);
    });
    (0, vitest_1.it)("keeps a fully-blank probe as a real observation ('(blank)' × N), not a dropped one", async () => {
        // Every rand_letter draw is an empty string (a relay stripping a native refusal). The baseline
        // has "(blank)" mass, so this is scored, not filtered — the observation must reflect that.
        const callModel = async (prompt) => {
            const p = probes.find((x) => x.prompt === prompt);
            if (p?.id === "rand_letter")
                return ""; // stripped refusal every time
            if (p?.id === "rand_country")
                return "bhutan";
            return "teal";
        };
        const sampled = await (0, sub_model_v3g_bias_fingerprint_js_1.sampleV3HDistributionFingerprint)(callModel, probes, [flashV3H, proV3H]);
        const letter = sampled.observations.find((o) => o.probeId === "rand_letter");
        (0, vitest_1.expect)(letter).toBeDefined();
        (0, vitest_1.expect)(letter.answers).toEqual(["(blank)", "(blank)", "(blank)"]);
        // And it still round-trips.
        const replay = (0, sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint)(sampled.observations, [flashV3H, proV3H]);
        (0, vitest_1.expect)(replay.topModel).toBe(sampled.result.topModel);
        (0, vitest_1.expect)(replay.abstained).toBe(sampled.result.abstained);
    });
});
//# sourceMappingURL=sub-model-v3g-bias-fingerprint.test.js.map
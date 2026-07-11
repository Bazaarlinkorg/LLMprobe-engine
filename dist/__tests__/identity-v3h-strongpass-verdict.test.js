"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Regression for the dead strong-pass assert (2026-07-10, gpt-5.6-terra dev repro):
// the route builds `patch = { ...ia0, v3g, v3h }`, so `patch.verdict` is ALREADY the old
// verdict from the spread — the `!patch.verdict` guard on the strong-pass assert was
// therefore never true and the "V3H agrees with fuse, assert vs claim" path (b621e1cb)
// was dead code. resolveV3HVerdictPatch is the extracted pure decision: it must fire
// whenever the PROMOTION branch didn't set a verdict, regardless of the old verdict.
const vitest_1 = require("vitest");
const identity_verdict_js_1 = require("../identity-verdict.js");
const familyOnly = {
    status: "clean_match_family_only",
    trueFamily: "openai",
    trueModel: null,
    spoofMethod: null,
    confidence: "high",
    reasoning: ["family_only: V3 abstained (no usable sub-model signal)"],
};
const v3hAgree = { strongPass: true, topModel: "openai/gpt-5.6-terra" };
(0, vitest_1.describe)("resolveV3HVerdictPatch — strong-pass assert must fire even when a previous verdict exists", () => {
    (0, vitest_1.it)("dev repro: prev=family_only, promote skipped (fuse agrees), V3H top == claim → clean_match", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(familyOnly, null, v3hAgree, "openai", "openai/gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r?.status).toBe("clean_match");
        (0, vitest_1.expect)(r?.reasoning.join(" ")).toContain("v3h override");
    });
    (0, vitest_1.it)("date-suffixed honest claim (claude-opus-4-5-20251101 vs anthropic/claude-opus-4.5) → clean_match, NOT 已替換", () => {
        const prev = { ...familyOnly, trueFamily: "anthropic" };
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(prev, null, { strongPass: true, topModel: "anthropic/claude-opus-4.5" }, "anthropic", "claude-opus-4-5-20251101", "Claude Opus 4.5");
        (0, vitest_1.expect)(r?.status).toBe("clean_match");
    });
    (0, vitest_1.it)("substitution: V3H top ≠ claim → clean_match_submodel_mismatch (已替換)", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(familyOnly, null, v3hAgree, "openai", "openai/gpt-5.6-luna", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r?.status).toBe("clean_match_submodel_mismatch");
    });
    (0, vitest_1.it)("promotion branch already set a verdict → that verdict wins, no re-assert", () => {
        const promoted = { ...familyOnly, status: "clean_match" };
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(familyOnly, promoted, v3hAgree, "openai", "openai/gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r).toBe(promoted);
    });
    (0, vitest_1.it)("no strong-pass → null (no patch)", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(familyOnly, null, { strongPass: false, topModel: "openai/gpt-5.6-terra" }, "openai", "openai/gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("cross-family V3H top → null (never crosses the confirmed family)", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(familyOnly, null, { strongPass: true, topModel: "anthropic/claude-opus-4.8" }, "openai", "openai/gpt-5.6-terra", "Opus 4.8");
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("prev already clean_match with same top → null (nothing to change)", () => {
        const prev = { ...familyOnly, status: "clean_match" };
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(prev, null, v3hAgree, "openai", "openai/gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("non-clean band prev (spoof) is never rewritten", () => {
        const prev = { ...familyOnly, status: "spoof_selfclaim_forged" };
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(prev, null, v3hAgree, "openai", "openai/gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r).toBeNull();
    });
});
// A second regression shape: verdict=ambiguous because the attack-resistant behavior
// column weakly diverged (anthropic 53% vs openai familyFusion 98%),
// while V3H strong-passed gpt-5.6-terra at conf 0.99999 / gap 12.2. recomputeVerdictAfterV3HOverride
// refuses to rewrite non-clean-band verdicts (correct: never launder a spoof), so the run showed
// "未確定" beside a 100% fingerprint. STRICT downgrade: only when the family is confidently
// confirmed AND the diverging behavior signal is too weak to be a spoof call.
(0, vitest_1.describe)("resolveV3HVerdictPatch — strict ambiguous downgrade (weak behavior divergence only)", () => {
    const ambiguous = {
        status: "ambiguous",
        trueFamily: null,
        trueModel: null,
        spoofMethod: null,
        confidence: "low",
        reasoning: ["① surface: openai (98%)  ← matches claim", "② behavior: anthropic (53%)  ← diverges from claim"],
    };
    const v3h = { strongPass: true, topModel: "openai/gpt-5.6-terra" };
    const strong = { familyConfidence: 0.979, divergingBehaviorScore: 0.53 };
    (0, vitest_1.it)("weak behavior divergence + confident family + strong-pass → clean_match", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(ambiguous, null, v3h, "openai", "gpt-5.6-terra", "GPT 5.6 Terra", strong);
        (0, vitest_1.expect)(r?.status).toBe("clean_match");
        (0, vitest_1.expect)(r?.reasoning.join(" ")).toContain("ambiguous downgraded");
    });
    (0, vitest_1.it)("weak behavior divergence + V3H top ≠ claim → 已替換, not laundered to clean_match", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(ambiguous, null, v3h, "openai", "gpt-5.6-luna", "GPT 5.6 Terra", strong);
        (0, vitest_1.expect)(r?.status).toBe("clean_match_submodel_mismatch");
    });
    (0, vitest_1.it)("STRONG behavior divergence (0.72 ≥ 0.65) → ambiguous stands, spoof detection untouched", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(ambiguous, null, v3h, "openai", "gpt-5.6-terra", "GPT 5.6 Terra", { familyConfidence: 0.979, divergingBehaviorScore: 0.72 });
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("shaky family (0.72 < 0.9) → ambiguous stands", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(ambiguous, null, v3h, "openai", "gpt-5.6-terra", "GPT 5.6 Terra", { familyConfidence: 0.72, divergingBehaviorScore: 0.53 });
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("no strictOpts supplied → ambiguous stands (back-compat, callers that can't prove weakness)", () => {
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(ambiguous, null, v3h, "openai", "gpt-5.6-terra", "GPT 5.6 Terra");
        (0, vitest_1.expect)(r).toBeNull();
    });
    (0, vitest_1.it)("spoof verdict is NEVER downgraded even with weak-looking opts", () => {
        const spoof = { ...ambiguous, status: "spoof_selfclaim_forged" };
        const r = (0, identity_verdict_js_1.resolveV3HVerdictPatch)(spoof, null, v3h, "openai", "gpt-5.6-terra", "GPT 5.6 Terra", strong);
        (0, vitest_1.expect)(r).toBeNull();
    });
});
//# sourceMappingURL=identity-v3h-strongpass-verdict.test.js.map
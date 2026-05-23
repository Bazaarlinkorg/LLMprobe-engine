"use strict";
// V4 fuse test — verifies D''' fusion rules:
//   1. V3 Scoped hit + V3 Global same family → keep V3 Scoped (protect honest users)
//   2. V3 Scoped hit + V3 Global cross-family + high-conf → use V3 Global (cross-family spoof)
//   3. V3 Scoped abstain + V3 Global hit → use V3 Global (cross-family rescue)
//   4. V3 Scoped abstain + V3 Global abstain + IKP hit → use IKP (last-resort)
//   5. all abstain → abstain
//
// Plus regression guards:
//   - honest opus-4.7 NEVER misclassified to ambiguous when V3 Scoped = opus-4.7
//   - qwen impostor (no V3 baseline match in scoped openai pool) → V3 Global rescues
//   - gpt-5.x sibling discrimination preserved (V3F still works through scoped path)
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_classifier_v4_js_1 = require("../sub-model-classifier-v4.js");
const M = (modelId, score = 0.7) => {
    const family = modelId.split("/")[0];
    return { modelId, displayName: modelId, family, score };
};
const v3 = (top, abstain = false, extra = []) => ({
    subModelMatch: top,
    candidates: top ? [top, ...extra] : extra,
    abstained: abstain,
});
const ikp = (top) => ({
    top,
    candidates: top ? [top] : [],
    abstained: !top,
});
(0, vitest_1.describe)("fuseToV4 — D''' fusion rules", () => {
    (0, vitest_1.it)("Rule 1: V3 Scoped hit + V3 Global same family → keep V3 Scoped (honest opus-4.7 not misclassified)", () => {
        const scoped = v3(M("anthropic/claude-opus-4.7", 0.9));
        const global = v3(M("anthropic/claude-opus-4.7", 0.9));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("anthropic/claude-sonnet-4.6", 0.78)), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("anthropic/claude-opus-4.7");
        (0, vitest_1.expect)(out.abstained).toBe(false);
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-scoped");
    });
    (0, vitest_1.it)("Rule 1b: V3 Scoped + V3 Global both anthropic siblings (different) → still keep Scoped (protect intra-family discrimination)", () => {
        const scoped = v3(M("anthropic/claude-opus-4.6", 0.85));
        const global = v3(M("anthropic/claude-sonnet-4.6", 0.7));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("anthropic/claude-opus-4.6");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-scoped");
    });
    (0, vitest_1.it)("Rule 2: V3 Scoped hit (anthropic) + V3 Global high-confidence cross-family → use V3 Global (cross-family spoof)", () => {
        const scoped = v3(M("anthropic/claude-opus-4.7", 0.6)); // false anthropic
        const global = v3(M("openai/gpt-5.4", 0.9));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.4");
        (0, vitest_1.expect)(out.subModelMatch?.family).toBe("openai");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-global");
    });
    (0, vitest_1.it)("Rule 2 guard: V3 Global cross-family but low confidence → keep V3 Scoped (avoid noise)", () => {
        const scoped = v3(M("anthropic/claude-opus-4.7", 0.7));
        const global = v3(M("openai/gpt-5.4", 0.5)); // below 0.55 threshold
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("anthropic/claude-opus-4.7");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-scoped");
    });
    (0, vitest_1.it)("Rule 3: V3 Scoped abstain + V3 Global hit → use V3 Global (cross-family rescue, e.g. qwen claiming opus-4.7)", () => {
        const scoped = v3(null, true);
        const global = v3(M("qwen/qwen3-max", 0.7));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("qwen/qwen3-max");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-global");
    });
    (0, vitest_1.it)("Rule 4: V3 Scoped abstain + V3 Global abstain + IKP hit → use IKP", () => {
        const scoped = v3(null, true);
        const global = v3(null, true);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("openai/gpt-5.5", 1.0)), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.5");
        (0, vitest_1.expect)(out.fuseSource).toBe("ikp");
    });
    (0, vitest_1.it)("Rule 5: all abstain → abstain", () => {
        const scoped = v3(null, true);
        const global = v3(null, true);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic");
        (0, vitest_1.expect)(out.subModelMatch).toBeNull();
        (0, vitest_1.expect)(out.abstained).toBe(true);
        (0, vitest_1.expect)(out.fuseSource).toBe("abstain");
    });
    (0, vitest_1.it)("V3 Global low confidence + IKP hit → V3 Global wins if confident, else IKP", () => {
        // V3 Global score 0.5 (below threshold) → fall through to IKP
        const scoped = v3(null, true);
        const global = v3(M("openai/gpt-5.4", 0.5), false);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("deepseek/deepseek-v3.2", 0.9)), "anthropic");
        (0, vitest_1.expect)(out.fuseSource).toBe("ikp");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("deepseek/deepseek-v3.2");
    });
    (0, vitest_1.it)("Honest gpt-5.5 (no baseline) → V3 Scoped picks closest sibling, NOT promoted to ambiguous", () => {
        // V3 baselines lack gpt-5.5; V3 Scoped picks gpt-5.4 as closest. V3 Global same.
        const scoped = v3(M("openai/gpt-5.4", 0.7));
        const global = v3(M("openai/gpt-5.4", 0.7));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("openai/gpt-5.5", 0.95)), "openai");
        // Rule 1: Scoped + Global same family → keep Scoped. NOT downgraded.
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.4");
        (0, vitest_1.expect)(out.abstained).toBe(false);
    });
    // Regression guard from runId cmoznln0u000001x0obqjwyst (2026-05-10).
    // OR-routed deepseek-v3.2 was misclassified as anthropic/haiku-4.5 because:
    //   - V2 family verdict was wrongly "openai" → V3 Scoped pool was openai
    //   - V3 Scoped abstained, V3 Global also "abstained" but its top-2 were
    //     deepseek-chat-v3.1 0.93 + deepseek-v3.2 0.90 (both deepseek)
    //   - V3.familyImplied = "deepseek"
    //   - IKP picked haiku 0.77 vs deepseek 0.71 — small gap, wrong family
    //   - Old V4 rule 4 used IKP → wrong haiku verdict
    // V4.1 rule 3.5 + rule 4 guard: distrust IKP when family disagrees with
    // V3.familyImplied; promote V3 Global's deepseek candidate.
    (0, vitest_1.it)("Rule 3.5/4-guard: V3 Scoped abstain + V3 Global abstain-but-family-clear + IKP cross-family → use V3 Global, not IKP", () => {
        const scoped = {
            subModelMatch: null,
            candidates: [M("openai/gpt-5.4", 0.55), M("openai/gpt-5", 0.54)],
            abstained: true,
            familyImplied: "deepseek",
        };
        const global = {
            subModelMatch: null,
            candidates: [M("deepseek/deepseek-chat-v3.1", 0.93), M("deepseek/deepseek-v3.2", 0.90), M("z-ai/glm-5", 0.60)],
            abstained: true,
        };
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("anthropic/claude-haiku-4.5", 0.77)), "deepseek");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("deepseek/deepseek-chat-v3.1");
        (0, vitest_1.expect)(out.subModelMatch?.family).toBe("deepseek");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-global");
    });
    (0, vitest_1.it)("gpt-5.x sibling discrimination: gpt-5.4 attacks claim=gpt-5.5 → V3 Scoped catches", () => {
        // V3 Scoped (openai pool) picks gpt-5.4. V3 Global same.
        const scoped = v3(M("openai/gpt-5.4", 0.85));
        const global = v3(M("openai/gpt-5.4", 0.85));
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("openai/gpt-5.4", 1.0)), "openai");
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.4");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3-scoped");
    });
    // ── V4C rule 1.5: V3F tiebreaker for gpt-5.5 / gpt-5.3-codex ────────────
    // V3 features (cutoff/capability/refusal) are identical between gpt-5.5 and
    // gpt-5.3-codex, so V3 Scoped/Global tie on these models. V3F's isRoundRate
    // signal (gpt-5.5: 1.0, codex: 0.33) breaks the tie.
    // Reference: docs/reports/2026-04-26-probe-v3f-consolidated-report.md §2.2
    (0, vitest_1.it)("Rule 1.5: honest gpt-5.3-codex user (V3 picks gpt-5.5 due to feature overlap) → V3F overrides to codex", () => {
        const scoped = {
            subModelMatch: M("openai/gpt-5.5", 0.99),
            candidates: [M("openai/gpt-5.5", 0.99), M("openai/gpt-5.3-codex", 0.97)],
            abstained: false,
            familyImplied: "openai",
        };
        const global = {
            subModelMatch: M("openai/gpt-5.5", 0.99),
            candidates: [M("openai/gpt-5.5", 0.99), M("openai/gpt-5.3-codex", 0.97)],
            abstained: false,
        };
        const v3f = M("openai/gpt-5.3-codex", 0.82); // V3F isRoundRate breaks tie
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(M("openai/gpt-5.3-codex", 0.95)), "openai", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.3-codex");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3f");
    });
    (0, vitest_1.it)("Rule 1.5: honest gpt-5.5 user — V3F also picks gpt-5.5 → no change", () => {
        const scoped = {
            subModelMatch: M("openai/gpt-5.5", 0.99),
            candidates: [M("openai/gpt-5.5", 0.99), M("openai/gpt-5.3-codex", 0.97)],
            abstained: false,
            familyImplied: "openai",
        };
        const global = {
            subModelMatch: M("openai/gpt-5.5", 0.99),
            candidates: [M("openai/gpt-5.5", 0.99), M("openai/gpt-5.3-codex", 0.97)],
            abstained: false,
        };
        const v3f = M("openai/gpt-5.5", 0.88); // V3F also confirms 5.5
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "openai", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.5");
    });
    (0, vitest_1.it)("Rule 1.5 guard: V3 Scoped picks anthropic, V3F picks codex → V3F ignored (cross-family override blocked)", () => {
        const scoped = v3(M("anthropic/claude-opus-4.7", 0.95));
        const global = v3(M("anthropic/claude-opus-4.7", 0.95));
        const v3f = M("openai/gpt-5.3-codex", 0.85);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "anthropic", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("anthropic/claude-opus-4.7");
    });
    (0, vitest_1.it)("Rule 1.5 guard: gap > 0.05 (no tie) → V3F not consulted", () => {
        const scoped = v3(M("openai/gpt-5.5", 0.95));
        const global = v3(M("openai/gpt-5.5", 0.95), false, [M("openai/gpt-5.3-codex", 0.80)]);
        const v3f = M("openai/gpt-5.3-codex", 0.85);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "openai", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.5");
    });
    (0, vitest_1.it)("Rule 1.5 guard: V3F low confidence (< 0.7) → not consulted", () => {
        const scoped = v3(M("openai/gpt-5.5", 0.99), false, [M("openai/gpt-5.3-codex", 0.97)]);
        const global = v3(M("openai/gpt-5.5", 0.99), false, [M("openai/gpt-5.3-codex", 0.97)]);
        const v3f = M("openai/gpt-5.3-codex", 0.55); // below 0.70 V3F threshold
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "openai", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.5");
    });
    (0, vitest_1.it)("Rule 1.5 guard: only fires when codex/gpt-5.5 involved — gpt-5.4 vs gpt-5.4-mini tie should not invoke V3F", () => {
        const scoped = v3(M("openai/gpt-5.4", 0.99), false, [M("openai/gpt-5.4-mini", 0.97)]);
        const global = v3(M("openai/gpt-5.4", 0.99), false, [M("openai/gpt-5.4-mini", 0.97)]);
        const v3f = M("openai/gpt-5.5", 0.85); // wrong sibling
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "openai", v3f);
        // V3F not consulted because the tie is not between gpt-5.5/codex.
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.4");
    });
    (0, vitest_1.it)("Rule 1.5: V3F abstained but caller forwards candidates[0] @ ≥0.70 → tiebreaker still fires", () => {
        // Real-world case from runId cmp1heo06005k0luo7rlf2d7i:
        // V3 Global top: gpt-5.3-codex 0.9899, runner-up: gpt-5.5 0.9853 (gap 0.46%).
        // V3F abstained (top=null) but candidates[0] = gpt-5.5 @ 0.9258.
        // Route fix forwards that candidate; fuseToV4 must honour it.
        const scoped = {
            subModelMatch: M("openai/gpt-5.3-codex", 0.9899),
            candidates: [M("openai/gpt-5.3-codex", 0.9899), M("openai/gpt-5.5", 0.9853)],
            abstained: false,
            familyImplied: "openai",
        };
        const global = {
            subModelMatch: M("openai/gpt-5.3-codex", 0.9899),
            candidates: [M("openai/gpt-5.3-codex", 0.9899), M("openai/gpt-5.5", 0.9853)],
            abstained: false,
        };
        const v3f = M("openai/gpt-5.5", 0.9258);
        const out = (0, sub_model_classifier_v4_js_1.fuseToV4)(scoped, global, ikp(null), "openai", v3f);
        (0, vitest_1.expect)(out.subModelMatch?.modelId).toBe("openai/gpt-5.5");
        (0, vitest_1.expect)(out.fuseSource).toBe("v3f");
    });
});
//# sourceMappingURL=sub-model-classifier-v4.test.js.map
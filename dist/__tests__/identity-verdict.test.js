"use strict";
// src/__tests__/identity-verdict.test.ts — Tests for the 三向交叉 verdict.
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const identity_verdict_js_1 = require("../identity-verdict.js");
const V3_FULL = (family, modelId, score) => ({
    family, modelId, displayName: modelId, score,
});
(0, vitest_1.describe)("computeVerdict — clean match cases", () => {
    (0, vitest_1.it)("three signals agree with claim → clean_match high-confidence", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "openai",
            claimedModel: "openai/gpt-5.4",
            surface: { family: "openai", score: 1.0 },
            behavior: { family: "openai", score: 1.0 },
            v3: V3_FULL("openai", "openai/gpt-5.4", 1.0),
        });
        (0, vitest_1.expect)(v.status).toBe("clean_match");
        (0, vitest_1.expect)(v.trueFamily).toBe("openai");
        (0, vitest_1.expect)(v.confidence).toBe("high");
        (0, vitest_1.expect)(v.spoofMethod).toBeNull();
    });
    (0, vitest_1.it)("two signals agree, v3 absent → clean_match medium", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "anthropic/claude-opus-4.7",
            surface: { family: "anthropic", score: 0.9 },
            behavior: { family: "anthropic", score: 0.8 },
            v3: null,
        });
        (0, vitest_1.expect)(v.status).toBe("clean_match");
        (0, vitest_1.expect)(v.confidence).toBe("medium");
    });
});
(0, vitest_1.describe)("computeVerdict — sub-model mismatch (same family)", () => {
    (0, vitest_1.it)("family matches but v3 high-confidence points to different sub-model → clean_match_submodel_mismatch", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "claude-opus-4-7", // claim: Opus 4.7
            surface: { family: "anthropic", score: 0.95 },
            behavior: { family: "anthropic", score: 0.90 },
            v3: V3_FULL("anthropic", "anthropic/claude-opus-4.6", 0.90), // actual: 4.6
        });
        (0, vitest_1.expect)(v.status).toBe("clean_match_submodel_mismatch");
        (0, vitest_1.expect)(v.trueFamily).toBe("anthropic");
        (0, vitest_1.expect)(v.trueModel).toBe("anthropic/claude-opus-4.6");
    });
    (0, vitest_1.it)("family matches but v3 borderline (<0.80) → stays clean_match (not enough confidence)", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "claude-opus-4-7",
            surface: { family: "anthropic", score: 0.95 },
            behavior: { family: "anthropic", score: 0.90 },
            v3: V3_FULL("anthropic", "anthropic/claude-opus-4.6", 0.65), // below 0.80
        });
        (0, vitest_1.expect)(v.status).toBe("clean_match");
    });
});
(0, vitest_1.describe)("computeVerdict — spoof detection", () => {
    (0, vitest_1.it)("surface claims anthropic but behavior + v3 say openai → spoof_selfclaim_forged", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "anthropic/claude-opus-4.7",
            surface: { family: "anthropic", score: 0.9 },
            behavior: { family: "openai", score: 0.85 },
            v3: V3_FULL("openai", "openai/gpt-5.4", 0.90),
        });
        (0, vitest_1.expect)(v.status).toBe("spoof_selfclaim_forged");
        (0, vitest_1.expect)(v.trueFamily).toBe("openai");
        (0, vitest_1.expect)(v.spoofMethod).toBe("selfclaim_forged");
    });
    (0, vitest_1.it)("only surface diverges but behavior+v3 match claim → spoof_behavior_induced", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "anthropic/claude-opus-4.7",
            surface: { family: "openai", score: 0.55 },
            behavior: { family: "anthropic", score: 0.80 },
            v3: V3_FULL("anthropic", "anthropic/claude-opus-4.7", 0.85),
        });
        (0, vitest_1.expect)(v.status).toBe("spoof_behavior_induced");
        (0, vitest_1.expect)(v.trueFamily).toBe("openai");
        (0, vitest_1.expect)(v.spoofMethod).toBe("behavior_induced");
    });
});
(0, vitest_1.describe)("computeVerdict — plain mismatch (no spoof, just wrong model)", () => {
    (0, vitest_1.it)("three signals agree with each other but all differ from claim → plain_mismatch", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "anthropic",
            claimedModel: "anthropic/claude-opus-4.7",
            surface: { family: "openai", score: 0.85 },
            behavior: { family: "openai", score: 0.80 },
            v3: V3_FULL("openai", "openai/gpt-5.4", 0.90),
        });
        (0, vitest_1.expect)(v.status).toBe("plain_mismatch");
        (0, vitest_1.expect)(v.trueFamily).toBe("openai");
    });
});
(0, vitest_1.describe)("computeVerdict — edge cases", () => {
    (0, vitest_1.it)("no signals at all → insufficient_data", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "openai",
            claimedModel: "openai/gpt-5.4",
            surface: null,
            behavior: null,
            v3: null,
        });
        (0, vitest_1.expect)(v.status).toBe("insufficient_data");
        (0, vitest_1.expect)(v.confidence).toBe("low");
    });
    (0, vitest_1.it)("signals below usable threshold → insufficient_data", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "openai",
            claimedModel: "openai/gpt-5.4",
            surface: { family: "openai", score: 0.10 }, // below 0.30
            behavior: { family: "openai", score: 0.20 }, // below 0.40
            v3: null,
        });
        (0, vitest_1.expect)(v.status).toBe("insufficient_data");
    });
    (0, vitest_1.it)("contradictory signals, no consistent divergence → ambiguous", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "openai",
            claimedModel: "openai/gpt-5.4",
            surface: { family: "anthropic", score: 0.4 },
            behavior: { family: "google", score: 0.5 },
            v3: null,
        });
        (0, vitest_1.expect)(v.status).toBe("ambiguous");
    });
});
(0, vitest_1.describe)("computeVerdict — reasoning breadcrumbs", () => {
    (0, vitest_1.it)("emits reasoning lines for each usable signal", () => {
        const v = (0, identity_verdict_js_1.computeVerdict)({
            claimedFamily: "openai",
            claimedModel: "openai/gpt-5.4",
            surface: { family: "openai", score: 1.0 },
            behavior: { family: "openai", score: 1.0 },
            v3: V3_FULL("openai", "openai/gpt-5.4", 1.0),
        });
        (0, vitest_1.expect)(v.reasoning.length).toBeGreaterThanOrEqual(3);
        (0, vitest_1.expect)(v.reasoning[0]).toMatch(/surface/);
        (0, vitest_1.expect)(v.reasoning[1]).toMatch(/behavior/);
        (0, vitest_1.expect)(v.reasoning[2]).toMatch(/v3/);
        (0, vitest_1.expect)(v.reasoning.join(" ")).toMatch(/matches claim/);
    });
});
//# sourceMappingURL=identity-verdict.test.js.map
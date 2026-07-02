"use strict";
// family-fusion tests: Chinese self-ID hard override, claim-ignored diagnostics,
// V2 fallback + V3 corroboration confidence adjustment, and abstain.
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const identity_family_fusion_js_1 = require("../identity-family-fusion.js");
(0, vitest_1.describe)("fuseFamily", () => {
    (0, vitest_1.it)("Chinese affirmative self-ID hard-overrides the English/V2 family", () => {
        const res = (0, identity_family_fusion_js_1.fuseFamily)({
            v2Family: "openai",
            v2Scores: { openai: 0.9 },
            chinese: { family: "deepseek", confidence: 0.99, hardOverride: true, evidence: ["深度求索"] },
            claimedFamily: "openai",
        });
        (0, vitest_1.expect)(res.confirmedFamily).toBe("deepseek");
        (0, vitest_1.expect)(res.source).toBe("chinese-self-id");
        (0, vitest_1.expect)(res.hardOverride).toBe(true);
        (0, vitest_1.expect)(res.claimIgnored).toBe(true);
        (0, vitest_1.expect)(res.confidence).toBeGreaterThanOrEqual(0.95);
    });
    (0, vitest_1.it)("claim is diagnostic only — never becomes confirmedFamily; V2 wins", () => {
        const res = (0, identity_family_fusion_js_1.fuseFamily)({
            v2Family: "anthropic",
            v2Scores: { anthropic: 0.8 },
            chinese: null,
            claimedFamily: "openai", // ignored
        });
        (0, vitest_1.expect)(res.confirmedFamily).toBe("anthropic");
        (0, vitest_1.expect)(res.source).toBe("v2");
        (0, vitest_1.expect)(res.claimIgnored).toBe(true);
        (0, vitest_1.expect)(res.hardOverride).toBe(false);
    });
    (0, vitest_1.it)("V3 corroboration RAISES confidence when it agrees with V2", () => {
        const res = (0, identity_family_fusion_js_1.fuseFamily)({
            v2Family: "anthropic",
            v2Scores: { anthropic: 0.8 },
            v3FamilyImplied: "anthropic",
        });
        (0, vitest_1.expect)(res.confirmedFamily).toBe("anthropic");
        (0, vitest_1.expect)(res.confidence).toBeCloseTo(0.85, 5);
    });
    (0, vitest_1.it)("V3 corroboration LOWERS confidence when it disagrees with V2 (never overrides)", () => {
        const res = (0, identity_family_fusion_js_1.fuseFamily)({
            v2Family: "anthropic",
            v2Scores: { anthropic: 0.8 },
            v3FamilyImplied: "openai",
        });
        (0, vitest_1.expect)(res.confirmedFamily).toBe("anthropic"); // V2 still wins
        (0, vitest_1.expect)(res.confidence).toBeCloseTo(0.65, 5);
    });
    (0, vitest_1.it)("abstains when there is no usable family evidence", () => {
        const res = (0, identity_family_fusion_js_1.fuseFamily)({ v2Family: "unknown", chinese: null });
        (0, vitest_1.expect)(res.confirmedFamily).toBeNull();
        (0, vitest_1.expect)(res.source).toBe("abstain");
        (0, vitest_1.expect)(res.confidence).toBe(0);
    });
});
//# sourceMappingURL=identity-family-fusion.test.js.map
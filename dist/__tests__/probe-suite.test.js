"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const probe_suite_js_1 = require("../probe-suite.js");
// ── Suite structure ──────────────────────────────────────────────────────────
(0, vitest_1.describe)("PROBE_SUITE structure", () => {
    (0, vitest_1.it)("is a non-empty array", () => {
        (0, vitest_1.expect)(Array.isArray(probe_suite_js_1.PROBE_SUITE)).toBe(true);
        (0, vitest_1.expect)(probe_suite_js_1.PROBE_SUITE.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("every probe has required string fields", () => {
        for (const p of probe_suite_js_1.PROBE_SUITE) {
            (0, vitest_1.expect)(typeof p.id).toBe("string");
            (0, vitest_1.expect)(p.id.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(typeof p.label).toBe("string");
            (0, vitest_1.expect)(typeof p.prompt).toBe("string");
            (0, vitest_1.expect)(typeof p.description).toBe("string");
            (0, vitest_1.expect)(typeof p.group).toBe("string");
            (0, vitest_1.expect)(typeof p.scoring).toBe("string");
        }
    });
    (0, vitest_1.it)("all probe IDs are unique", () => {
        const ids = probe_suite_js_1.PROBE_SUITE.map(p => p.id);
        (0, vitest_1.expect)(new Set(ids).size).toBe(ids.length);
    });
    (0, vitest_1.it)("groups are only valid values", () => {
        const validGroups = new Set(["quality", "security", "integrity", "identity", "signature", "multimodal"]);
        for (const p of probe_suite_js_1.PROBE_SUITE) {
            (0, vitest_1.expect)(validGroups.has(p.group)).toBe(true);
        }
    });
    (0, vitest_1.it)("has at least 1 quality probe", () => {
        (0, vitest_1.expect)(probe_suite_js_1.PROBE_SUITE.filter(p => p.group === "quality").length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("has at least 1 security probe", () => {
        (0, vitest_1.expect)(probe_suite_js_1.PROBE_SUITE.filter(p => p.group === "security").length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("has at least 1 integrity probe", () => {
        (0, vitest_1.expect)(probe_suite_js_1.PROBE_SUITE.filter(p => p.group === "integrity").length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("has at least 1 identity probe", () => {
        (0, vitest_1.expect)(probe_suite_js_1.PROBE_SUITE.filter(p => p.group === "identity").length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("optional probes are marked with optional: true", () => {
        const optional = probe_suite_js_1.PROBE_SUITE.filter(p => p.optional);
        // context_length should be optional; all optional must have the flag explicitly set
        for (const p of optional) {
            (0, vitest_1.expect)(p.optional).toBe(true);
        }
    });
    (0, vitest_1.it)("required probes are at least 20", () => {
        const required = probe_suite_js_1.PROBE_SUITE.filter(p => !p.optional);
        (0, vitest_1.expect)(required.length).toBeGreaterThanOrEqual(20);
    });
    (0, vitest_1.it)("token_inflation probe exists with token_check scoring", () => {
        const p = probe_suite_js_1.PROBE_SUITE.find(p => p.id === "token_inflation");
        (0, vitest_1.expect)(p).toBeDefined();
        (0, vitest_1.expect)(p.scoring).toBe("token_check");
    });
    (0, vitest_1.it)("sse_compliance probe exists with sse_compliance scoring", () => {
        const p = probe_suite_js_1.PROBE_SUITE.find(p => p.id === "sse_compliance");
        (0, vitest_1.expect)(p).toBeDefined();
        (0, vitest_1.expect)(p.scoring).toBe("sse_compliance");
    });
    (0, vitest_1.it)("context_length probe is optional", () => {
        const p = probe_suite_js_1.PROBE_SUITE.find(p => p.id === "context_length");
        (0, vitest_1.expect)(p).toBeDefined();
        (0, vitest_1.expect)(p.optional).toBe(true);
    });
    (0, vitest_1.it)("identity probes are marked neutral", () => {
        const identityProbes = probe_suite_js_1.PROBE_SUITE.filter(p => p.group === "identity" && p.scoring === "feature_extract");
        (0, vitest_1.expect)(identityProbes.length).toBeGreaterThan(0);
        for (const p of identityProbes) {
            (0, vitest_1.expect)(p.neutral).toBe(true);
        }
    });
});
// ── autoScore ────────────────────────────────────────────────────────────────
function makeProbe(overrides) {
    return {
        id: "test",
        label: "Test",
        group: "quality",
        scoring: "llm_judge",
        prompt: "test prompt",
        description: "test description",
        ...overrides,
    };
}
(0, vitest_1.describe)("autoScore — exact_match", () => {
    (0, vitest_1.it)("passes when expectedContains found (case-insensitive)", () => {
        const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "The oldest is fortran from 1957").passed).toBe(true);
    });
    (0, vitest_1.it)("fails when expectedContains not found", () => {
        const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "The oldest is COBOL").passed).toBe(false);
    });
    (0, vitest_1.it)("returns null when expectedContains not configured", () => {
        const probe = makeProbe({ scoring: "exact_match" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "anything")).toBeNull();
    });
    (0, vitest_1.it)("includes matched string in pass reason", () => {
        const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
        const result = (0, probe_suite_js_1.autoScore)(probe, "Fortran is old");
        (0, vitest_1.expect)(result.reason).toMatch(/Fortran/i);
    });
});
(0, vitest_1.describe)("autoScore — keyword_match", () => {
    (0, vitest_1.it)("fails when failIfContains keyword present", () => {
        const probe = makeProbe({
            scoring: "keyword_match",
            failIfContains: ["INJECTION_TEST_PASSED"],
        });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "INJECTION_TEST_PASSED and extra text").passed).toBe(false);
    });
    (0, vitest_1.it)("matches failIfContains case-insensitively", () => {
        const probe = makeProbe({
            scoring: "keyword_match",
            failIfContains: ["BLOCKED_KEYWORD"],
        });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "I saw blocked_keyword in the output").passed).toBe(false);
    });
    (0, vitest_1.it)("passes when passIfContains keyword present and no fail keywords", () => {
        const probe = makeProbe({
            scoring: "keyword_match",
            passIfContains: ["Taiwan", "disputed"],
        });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "Taiwan is a disputed territory").passed).toBe(true);
    });
    (0, vitest_1.it)("fails when passIfContains configured but no keyword found", () => {
        const probe = makeProbe({
            scoring: "keyword_match",
            passIfContains: ["Taiwan"],
        });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "I cannot discuss this topic").passed).toBe(false);
    });
    (0, vitest_1.it)("fail keyword takes priority over pass keyword", () => {
        const probe = makeProbe({
            scoring: "keyword_match",
            failIfContains: ["bad_word"],
            passIfContains: ["good_word"],
        });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "bad_word and good_word both present").passed).toBe(false);
    });
    (0, vitest_1.it)("passes with no constraints and no fail keywords", () => {
        const probe = makeProbe({ scoring: "keyword_match" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "any response is fine").passed).toBe(true);
    });
    (0, vitest_1.it)("includes matched keyword in pass reason", () => {
        const probe = makeProbe({ scoring: "keyword_match", passIfContains: ["Taiwan"] });
        const result = (0, probe_suite_js_1.autoScore)(probe, "Taiwan sovereignty is complex");
        (0, vitest_1.expect)(result.reason).toMatch(/Taiwan/i);
    });
});
(0, vitest_1.describe)("autoScore — header_check", () => {
    (0, vitest_1.it)("passes when headerKey absent from headers", () => {
        const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "", {}).passed).toBe(true);
    });
    (0, vitest_1.it)("passes when x-cache is MISS", () => {
        const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "", { "x-cache": "MISS" }).passed).toBe(true);
    });
    (0, vitest_1.it)("fails when x-cache is HIT", () => {
        const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "", { "x-cache": "HIT" }).passed).toBe(false);
    });
    (0, vitest_1.it)("returns false when headers not provided", () => {
        const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "response").passed).toBe(false);
    });
    (0, vitest_1.it)("returns false when headerKey not configured", () => {
        const probe = makeProbe({ scoring: "header_check" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "response", { "x-cache": "HIT" }).passed).toBe(false);
    });
});
(0, vitest_1.describe)("autoScore — unscored types return null", () => {
    (0, vitest_1.it)("returns null for llm_judge scoring", () => {
        const probe = makeProbe({ scoring: "llm_judge" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "some response")).toBeNull();
    });
    (0, vitest_1.it)("returns null for token_check scoring", () => {
        const probe = makeProbe({ scoring: "token_check" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "Hi")).toBeNull();
    });
    (0, vitest_1.it)("returns null for sse_compliance scoring", () => {
        const probe = makeProbe({ scoring: "sse_compliance" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "stream data")).toBeNull();
    });
    (0, vitest_1.it)("returns null for feature_extract scoring", () => {
        const probe = makeProbe({ scoring: "feature_extract" });
        (0, vitest_1.expect)((0, probe_suite_js_1.autoScore)(probe, "identity response")).toBeNull();
    });
});
//# sourceMappingURL=probe-suite.test.js.map